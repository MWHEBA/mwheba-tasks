#!/usr/bin/env python3
"""
SSH/SFTP Deployment Script
Requires: pip install paramiko
"""

import os
import sys
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("❌ paramiko not installed")
    print("Install with: pip install paramiko")
    sys.exit(1)


class SSHDeployer:
    """Deploy files using SSH/SFTP"""
    
    def __init__(self, host: str, username: str, password: str, port: int = 22):
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.ssh = None
        self.sftp = None
        self.use_root_mode = False
        self.root_password = None
        self.backend_path = None
    
    def connect(self) -> bool:
        """Connect via SSH"""
        try:
            print(f"🔌 Connecting to {self.host}:{self.port}...")
            
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            self.ssh.connect(
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=30
            )
            
            self.sftp = self.ssh.open_sftp()
            
            print(f"✓ Connected successfully")
            
            return True
            
        except Exception as e:
            print(f"✗ Connection failed: {str(e)}")
            return False
    
    def disconnect(self):
        """Disconnect"""
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        print("🔌 Disconnected")
    
    def switch_to_root(self, root_password: str) -> bool:
        """Switch to root user using su"""
        try:
            print("🔐 Switching to root...")
            
            # Execute su command
            stdin, stdout, stderr = self.ssh.exec_command('su - root')
            stdin.write(f'{root_password}\n')
            stdin.flush()
            
            # Wait a bit for authentication
            import time
            time.sleep(1)
            
            # Test if we're root
            stdin, stdout, stderr = self.ssh.exec_command('whoami')
            user = stdout.read().decode().strip()
            
            if user == 'root':
                print("✓ Now running as root")
                return True
            else:
                print(f"⚠️  Still running as: {user}")
                return False
                
        except Exception as e:
            print(f"✗ Failed to switch to root: {str(e)}")
            return False
    
    def upload_file(self, local_path: str, remote_path: str) -> bool:
        """Upload file via SFTP"""
        try:
            # Create parent directory if needed
            remote_dir = os.path.dirname(remote_path)
            if remote_dir:
                self._mkdir_p(remote_dir)
            
            self.sftp.put(local_path, remote_path)
            print(f"✓ Uploaded: {remote_path}")
            return True
            
        except Exception as e:
            print(f"✗ Failed: {str(e)}")
            return False
    
    def upload_file_as_root(self, local_path: str, remote_path: str, root_password: str, owner: str = None, skip_dir_setup: bool = False) -> bool:
        """Upload file with root permissions and set correct ownership"""
        try:
            # Upload to temp location first
            temp_path = f"/tmp/{os.path.basename(local_path)}_{os.getpid()}"
            self.sftp.put(local_path, temp_path)
            
            # Batch all commands into one to reduce SSH overhead
            commands = []
            
            # Create parent directory if needed (only if not already done)
            if not skip_dir_setup:
                remote_dir = os.path.dirname(remote_path)
                if remote_dir:
                    commands.append(f'mkdir -p {remote_dir}')
                    if owner:
                        commands.append(f'chown {owner} {remote_dir}')
                    commands.append(f'chmod 755 {remote_dir}')
            
            # File operations
            commands.extend([
                f'rm -f {remote_path}',
                f'cp {temp_path} {remote_path}',
                f'rm -f {temp_path}'
            ])
            
            if owner:
                commands.append(f'chown {owner} {remote_path}')
            
            commands.append(f'chmod 644 {remote_path}')
            
            # Execute all commands in one sudo call
            batch_cmd = ' && '.join(commands)
            stdin, stdout, stderr = self.ssh.exec_command(
                f'echo {root_password} | sudo -S bash -c "{batch_cmd}"'
            )
            stdout.read()
            
            return True
            
        except Exception as e:
            print(f"✗ Failed {remote_path}: {str(e)}")
            return False
    
    def _mkdir_p(self, remote_path: str):
        """Create directory recursively"""
        dirs = []
        path = remote_path
        
        while path and path != '/':
            dirs.append(path)
            path = os.path.dirname(path)
        
        dirs.reverse()
        
        for dir_path in dirs:
            try:
                self.sftp.stat(dir_path)
            except:
                try:
                    self.sftp.mkdir(dir_path)
                except:
                    pass
    
    def deploy_directory_rsync(self, local_dir: str, remote_dir: str, exclude: list = None) -> tuple:
        """Deploy directory using rsync over SSH (fastest method)"""
        exclude = exclude or []
        
        local_path = Path(local_dir)
        if not local_path.exists():
            print(f"✗ Not found: {local_dir}")
            return (0, 1)
        
        print(f"\n📦 Deploying {local_dir} → {remote_dir} (rsync)")
        
        try:
            import subprocess
            
            # Build rsync command
            rsync_cmd = [
                'rsync',
                '-avz',  # archive, verbose, compress
                '--progress',
                '--checksum',  # compare by checksum not timestamp (slower but accurate)
                # '--delete',  # delete files that don't exist locally (commented for safety)
            ]
            
            # Add excludes
            for pattern in exclude:
                rsync_cmd.extend(['--exclude', pattern])
            
            # Add source and destination
            # Ensure local_dir ends with / to sync contents
            local_source = str(local_path) + ('/' if not str(local_path).endswith('/') else '')
            
            # Build SSH destination
            ssh_dest = f"{self.username}@{self.host}:{remote_dir}/"
            
            rsync_cmd.extend([local_source, ssh_dest])
            
            # Add SSH options
            ssh_opts = f"ssh -p {self.port}"
            if self.password:
                # Use sshpass if available for password auth
                try:
                    subprocess.run(['sshpass', '-V'], capture_output=True, check=True)
                    rsync_cmd = ['sshpass', '-p', self.password] + rsync_cmd
                except:
                    print("⚠️  sshpass not found - you may need to enter password manually")
            
            rsync_cmd.extend(['-e', ssh_opts])
            
            print(f"🚀 Running rsync...")
            
            # Run rsync
            result = subprocess.run(
                rsync_cmd,
                capture_output=False,
                text=True
            )
            
            if result.returncode == 0:
                print(f"✓ rsync completed successfully")
                
                # Fix ownership if in root mode
                if self.use_root_mode and self.root_password:
                    self._fix_ownership_recursive(remote_dir)
                
                return (1, 0)  # Success
            else:
                print(f"✗ rsync failed with code {result.returncode}")
                return (0, 1)  # Fail
                
        except FileNotFoundError:
            print("⚠️  rsync not found - falling back to SFTP")
            return self.deploy_directory_sftp(local_dir, remote_dir, exclude)
        except Exception as e:
            print(f"✗ rsync error: {str(e)}")
            print("⚠️  Falling back to SFTP")
            return self.deploy_directory_sftp(local_dir, remote_dir, exclude)
    
    def _should_upload_file(self, local_file: str, remote_file: str) -> bool:
        """Check if file needs upload by comparing size"""
        try:
            local_size = os.path.getsize(local_file)
            
            try:
                remote_stat = self.sftp.stat(remote_file)
                remote_size = remote_stat.st_size
                
                # Skip if same size (fast check)
                if local_size == remote_size:
                    return False
                    
            except FileNotFoundError:
                # Remote file doesn't exist, need to upload
                pass
            
            return True
            
        except:
            # If any error, upload to be safe
            return True
    
    def deploy_directory_sftp(self, local_dir: str, remote_dir: str, exclude: list = None, skip_unchanged: bool = True) -> tuple:
        """Deploy directory with optimized batch operations (SFTP fallback)"""
        exclude = exclude or []
        success = 0
        fail = 0
        skipped = 0
        
        local_path = Path(local_dir)
        if not local_path.exists():
            print(f"✗ Not found: {local_dir}")
            return (0, 1)
        
        print(f"\n📦 Deploying {local_dir} → {remote_dir} (SFTP)")
        
        # Collect all files first
        files_to_upload = []
        dirs_needed = set()
        
        for root, dirs, files in os.walk(local_dir):
            rel_path = Path(root).relative_to(local_path)
            
            if any(p in str(rel_path) for p in exclude):
                continue
            
            for file in files:
                # Build relative file path for checking
                rel_file_path = str(Path(rel_path) / file).replace('\\', '/')
                
                # Check if file should be excluded
                should_exclude = False
                for pattern in exclude:
                    if pattern in file or pattern in rel_file_path or rel_file_path.endswith(pattern):
                        should_exclude = True
                        print(f"🚫 Excluding: {rel_file_path} (matched pattern: {pattern})")
                        break
                
                if should_exclude:
                    continue
                
                local_file = os.path.join(root, file)
                remote_file = os.path.join(remote_dir, str(rel_path), file).replace('\\', '/')
                files_to_upload.append((local_file, remote_file))
                
                # Track directories needed
                remote_file_dir = os.path.dirname(remote_file)
                dirs_needed.add(remote_file_dir)
        
        print(f"📊 Found {len(files_to_upload)} files in {len(dirs_needed)} directories")
        
        # Create ALL directories at once
        if self.use_root_mode and self.root_password:
            self._create_all_dirs_root(dirs_needed)
        else:
            for dir_path in sorted(dirs_needed):
                self._mkdir_p(dir_path)
        
        # Filter files that need upload
        if skip_unchanged:
            print(f"🔍 Checking for changes...")
            files_to_upload_filtered = []
            for local_file, remote_file in files_to_upload:
                if self._should_upload_file(local_file, remote_file):
                    files_to_upload_filtered.append((local_file, remote_file))
                else:
                    skipped += 1
            
            files_to_upload = files_to_upload_filtered
            print(f"⏭️  Skipped {skipped} unchanged files")
        
        if not files_to_upload:
            print(f"✓ All files up to date!")
            return (0, 0)
        
        print(f"⬆️  Uploading {len(files_to_upload)} files...")
        
        # Track uploaded files for display
        uploaded_files = []
        
        # Upload files with progress indicator
        for idx, (local_file, remote_file) in enumerate(files_to_upload, 1):
            print(f"   Progress: {idx}/{len(files_to_upload)}", end='\r')
            
            upload_success = False
            if self.use_root_mode and self.root_password:
                owner = getattr(self, 'file_owner', None)
                # Skip directory setup since we did it in batch
                if self.upload_file_as_root(local_file, remote_file, self.root_password, owner, skip_dir_setup=True):
                    success += 1
                    upload_success = True
                else:
                    fail += 1
            else:
                if self.upload_file(local_file, remote_file):
                    success += 1
                    upload_success = True
                else:
                    fail += 1
            
            # Track uploaded file
            if upload_success:
                uploaded_files.append(os.path.basename(remote_file))
        
        print()  # New line after progress
        
        # Show last 10 uploaded files
        if uploaded_files:
            print(f"\n📄 Last 10 uploaded files:")
            for filename in uploaded_files[-10:]:
                print(f"   • {filename}")
            
            if len(uploaded_files) > 10:
                print(f"   ... and {len(uploaded_files) - 10} more")
        
        return (success, fail)
    
    def deploy_directory(self, local_dir: str, remote_dir: str, exclude: list = None, use_rsync: bool = False) -> tuple:
        """Deploy directory - uses SFTP by default (faster on Windows), rsync optional"""
        if use_rsync:
            return self.deploy_directory_rsync(local_dir, remote_dir, exclude)
        else:
            return self.deploy_directory_sftp(local_dir, remote_dir, exclude)
    
    def _create_all_dirs_root(self, dirs: set):
        """Create all directories at once with single command"""
        if not dirs:
            return
        
        try:
            owner = getattr(self, 'file_owner', None)
            
            # Sort to create parent dirs first
            sorted_dirs = sorted(dirs)
            
            # Build batch command
            commands = []
            for dir_path in sorted_dirs:
                commands.append(f'mkdir -p {dir_path}')
            
            if owner:
                for dir_path in sorted_dirs:
                    commands.append(f'chown {owner} {dir_path}')
            
            for dir_path in sorted_dirs:
                commands.append(f'chmod 755 {dir_path}')
            
            # Execute all at once
            batch_cmd = ' && '.join(commands)
            stdin, stdout, stderr = self.ssh.exec_command(
                f'echo {self.root_password} | sudo -S bash -c "{batch_cmd}"'
            )
            stdout.read()
            
            print(f"✓ Created {len(sorted_dirs)} directories")
            
        except Exception as e:
            print(f"⚠️  Directory creation warning: {str(e)}")
    
    def _fix_ownership_recursive(self, remote_dir: str):
        """Fix ownership recursively after rsync"""
        try:
            owner = getattr(self, 'file_owner', None)
            if not owner:
                return
            
            print(f"🔧 Fixing ownership...")
            
            stdin, stdout, stderr = self.ssh.exec_command(
                f'echo {self.root_password} | sudo -S chown -R {owner} {remote_dir}'
            )
            stdout.read()
            
            print(f"✓ Ownership fixed")
            
        except Exception as e:
            print(f"⚠️  Ownership fix warning: {str(e)}")
    
    def _mkdir_p_root(self, remote_path: str):
        """Create directory with sudo and set ownership"""
        try:
            # Create directory
            stdin, stdout, stderr = self.ssh.exec_command(
                f'echo {self.root_password} | sudo -S mkdir -p {remote_path}'
            )
            stdout.read()
            
            # Set ownership from config - RECURSIVELY for all subdirectories
            owner = getattr(self, 'file_owner', None)
            if owner:
                stdin, stdout, stderr = self.ssh.exec_command(
                    f'echo {self.root_password} | sudo -S chown -R {owner} {remote_path}'
                )
                stdout.read()
            
            # Set permissions (755 for directories - owner can write/delete)
            stdin, stdout, stderr = self.ssh.exec_command(
                f'echo {self.root_password} | sudo -S chmod 755 {remote_path}'
            )
            stdout.read()
        except:
            pass
    
    def clean_old_migrations(self) -> bool:
        """Clean old migration files on server (keep only __init__.py and 0001_initial.py)"""
        try:
            if not self.backend_path:
                print("⚠️  Backend path not set, skipping migration cleanup")
                return False
            
            print(f"\n🧹 Cleaning old migrations...")
            
            # Apps with migrations
            apps = ['clients', 'notifications', 'products', 'settings', 'statuses', 'tasks', 'users']
            
            commands = []
            for app in apps:
                migrations_dir = f"{self.backend_path}/{app}/migrations"
                # Remove all .py files except __init__.py and 0001_initial.py
                # Also remove all __pycache__ directories
                commands.append(f'find {migrations_dir} -type f -name "*.py" ! -name "__init__.py" ! -name "0001_initial.py" -delete')
                commands.append(f'find {migrations_dir} -type d -name "__pycache__" -exec rm -rf {{}} + 2>/dev/null || true')
            
            # Execute cleanup commands
            if self.use_root_mode and self.root_password:
                batch_cmd = ' && '.join(commands)
                stdin, stdout, stderr = self.ssh.exec_command(
                    f'echo {self.root_password} | sudo -S bash -c "{batch_cmd}"'
                )
            else:
                batch_cmd = ' && '.join(commands)
                stdin, stdout, stderr = self.ssh.exec_command(batch_cmd)
            
            stdout.read()
            
            print(f"✓ Old migrations cleaned")
            return True
            
        except Exception as e:
            print(f"⚠️  Migration cleanup failed: {str(e)}")
            return False
    
    def restart_app(self) -> bool:
        """Restart the Python app by touching passenger_wsgi.py"""
        try:
            if not self.backend_path:
                print("⚠️  Backend path not set, skipping restart")
                return False
            
            wsgi_file = f"{self.backend_path}/passenger_wsgi.py"
            tmp_dir = f"{self.backend_path}/tmp"
            restart_file = f"{tmp_dir}/restart.txt"
            
            print(f"\n🔄 Restarting application...")
            
            # Try multiple restart methods
            commands = []
            
            # Method 1: Touch restart.txt (Passenger standard)
            commands.append(f'mkdir -p {tmp_dir}')
            commands.append(f'touch {restart_file}')
            
            # Method 2: Touch passenger_wsgi.py (alternative)
            commands.append(f'touch {wsgi_file}')
            
            # Execute restart commands
            if self.use_root_mode and self.root_password:
                batch_cmd = ' && '.join(commands)
                stdin, stdout, stderr = self.ssh.exec_command(
                    f'echo {self.root_password} | sudo -S bash -c "{batch_cmd}"'
                )
            else:
                batch_cmd = ' && '.join(commands)
                stdin, stdout, stderr = self.ssh.exec_command(batch_cmd)
            
            stdout.read()
            
            return True
            
        except Exception as e:
            print(f"⚠️  Restart failed: {str(e)}")
            return False


def load_config():
    """Load config and auto-generate paths"""
    config_file = Path(__file__).parent / 'deploy_config.env'
    
    if not config_file.exists():
        print("✗ deploy_config.env not found")
        sys.exit(1)
    
    config = {}
    with open(config_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
    
    # Auto-generate paths from username
    cpanel_user = config.get('CPANEL_USERNAME', '')
    if cpanel_user:
        # Generate full paths
        backend_folder = config.get('BACKEND_REMOTE_FOLDER', 'backend')
        frontend_folder = config.get('FRONTEND_REMOTE_FOLDER', 'public_html')
        
        config['BACKEND_REMOTE_PATH'] = f"/home/{cpanel_user}/{backend_folder}"
        config['FRONTEND_REMOTE_PATH'] = f"/home/{cpanel_user}/{frontend_folder}"
        
        # Auto-generate file owner
        config['FILE_OWNER'] = f"{cpanel_user}:{cpanel_user}"
        
        # Legacy support for old config keys
        if not config.get('CPANEL_URL'):
            config['CPANEL_URL'] = f"https://{config.get('SSH_HOST', '')}:2083"
    
    return config


def build_frontend():
    """Build frontend"""
    project_root = Path(__file__).parent.parent.parent
    os.chdir(project_root)
    
    if os.system('npm run build') != 0:
        print("✗ Build failed")
        return False
    
    return True


def main():
    
    config = load_config()
    
    # Extract host
    ssh_host = config.get('SSH_HOST', config.get('FTP_HOST', config.get('CPANEL_URL', '')))
    ssh_host = ssh_host.replace('https://', '').replace('http://', '').split(':')[0]
    
    deployer = SSHDeployer(
        host=ssh_host,
        username=config.get('SSH_USERNAME', config.get('CPANEL_USERNAME', '')),
        password=config.get('SSH_PASSWORD', config.get('CPANEL_PASSWORD', '')),
        port=int(config.get('SSH_PORT', '22'))
    )
    
    # Set backend path for restart
    deployer.backend_path = config.get('BACKEND_REMOTE_PATH')
    
    if not deployer.connect():
        sys.exit(1)
    
    # Auto-detect if root mode is needed (SSH user != cPanel user)
    ssh_user = config.get('SSH_USERNAME', '')
    cpanel_user = config.get('CPANEL_USERNAME', '')
    ssh_password = config.get('SSH_PASSWORD', '')
    use_root = ssh_user != cpanel_user
    
    if use_root:
        file_owner = config.get('FILE_OWNER')
        
        if file_owner:
            print(f"📋 Files will be owned by: {file_owner}")
        
        deployer.root_password = ssh_password
        deployer.use_root_mode = True
        deployer.file_owner = file_owner
    else:
        print(f"\n✓ Direct mode (SSH user = owner)")
        deployer.use_root_mode = False
    
    try:
        print("\nDeploy:")
        print("1. Frontend only")
        print("2. Backend only")
        print("3. Both")
        
        choice = input("\nChoice (1-3): ").strip()
        
        total_success = 0
        total_fail = 0
        
        if choice in ['1', '3']:
            if not build_frontend():
                sys.exit(1)
            
            s, f = deployer.deploy_directory(
                'dist',
                config.get('FRONTEND_REMOTE_PATH'),
                ['.git', '__pycache__', '.DS_Store']
            )
            total_success += s
            total_fail += f
        
        if choice in ['2', '3']:
            # Clean old migrations before deploying new ones
            deployer.clean_old_migrations()
            
            # Ask about excluding backend/backend/urls.py
            exclude_urls = input("\nExclude backend/backend/urls.py? (y/n): ").strip().lower()
            
            backend_excludes = ['.git', '__pycache__', '*.pyc', '.pytest_cache', 'logs', 'media', 'staticfiles', 'tmp', '.env']
            
            if exclude_urls == 'y':
                backend_excludes.append('backend/urls.py')
                print("✓ backend/backend/urls.py will be excluded")
                print(f"📋 Exclude patterns: {backend_excludes}")
            
            s, f = deployer.deploy_directory(
                'backend',
                config.get('BACKEND_REMOTE_PATH'),
                backend_excludes
            )
            total_success += s
            total_fail += f
            
            # Auto-restart app after backend deployment
            if total_fail == 0:
                deployer.restart_app()
        
        print("\n" + "=" * 60)
        print("Summary")
        print("=" * 60)
        print(f"✓ Success: {total_success}")
        print(f"✗ Failed: {total_fail}")
        
        if total_fail == 0:
            print("\n🎉 Deployment completed!")
    
    finally:
        deployer.disconnect()


if __name__ == '__main__':
    main()
