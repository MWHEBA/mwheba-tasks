from django.core.management.base import BaseCommand
from statuses.models import TaskStatus


class Command(BaseCommand):
    help = 'Load initial task statuses'

    def handle(self, *args, **options):
        statuses = [
            {
                'id': 'Pending',
                'label': 'قيد الانتظار',
                'color': '#94a3b8',
                'orderIndex': 0,
                'isFinished': False,
                'isDefault': True
            },
            {
                'id': 'In Progress',
                'label': 'قيد التنفيذ',
                'color': '#3b82f6',
                'orderIndex': 1,
                'isFinished': False,
                'isDefault': False
            },
            {
                'id': 'Has Comments',
                'label': 'يوجد تعليقات',
                'color': '#f59e0b',
                'orderIndex': 2,
                'isFinished': False,
                'isDefault': False
            },
            {
                'id': 'Editing Completed',
                'label': 'اكتمل التعديل',
                'color': '#10b981',
                'orderIndex': 3,
                'isFinished': False,
                'isDefault': False
            },
            {
                'id': 'Ready for Delivery',
                'label': 'جاهز للتسليم',
                'color': '#8b5cf6',
                'orderIndex': 4,
                'isFinished': False,
                'isDefault': False
            },
            {
                'id': 'Delivered',
                'label': 'تم التسليم',
                'color': '#059669',
                'orderIndex': 5,
                'isFinished': True,
                'isDefault': False
            },
        ]

        for status_data in statuses:
            status, created = TaskStatus.objects.get_or_create(
                id=status_data['id'],
                defaults=status_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ تم إنشاء الحالة: {status.label}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'- الحالة موجودة بالفعل: {status.label}')
                )

        self.stdout.write(self.style.SUCCESS('\n✓ تم تحميل البيانات الافتراضية بنجاح'))
