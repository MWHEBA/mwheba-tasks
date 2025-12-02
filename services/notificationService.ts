
import { SettingsService } from './settingsService';
import { Task, WhatsAppType, NotificationTemplateType } from '../types';
import { TemplateService } from './templateService';

// Helper to send to specific groups
const sendToTargetGroups = async (groups: WhatsAppType[], messageBody: string) => {
    const settings = SettingsService.get();
    if (!settings.whatsappNumbers) return;

    // Filter enabled numbers belonging to the target groups
    const targets = settings.whatsappNumbers.filter(n => 
        n.enabled && groups.includes(n.type)
    );

    if (targets.length === 0) return;

    // Send via CallMeBot API
    const promises = targets.map(async (wa) => {
        if (!wa.number || !wa.apiKey) return;
        
        try {
            const encodedMessage = encodeURIComponent(messageBody.trim());
            const url = `https://api.callmebot.com/whatsapp.php?phone=${wa.number}&text=${encodedMessage}&apikey=${wa.apiKey}`;
            
            await fetch(url, { 
              mode: 'no-cors',
              method: 'GET'
            });
        } catch (error) {
            console.error(`Failed to send to ${wa.name}`, error);
        }
    });

    await Promise.all(promises);
};

export const NotificationService = {
  
  // Rule 1: New Main Task + Subtasks
  // Targets: Management, Designer
  notifyNewProject: async (mainTask: Task) => {
      try {
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.NEW_PROJECT,
              {
                  clientName: mainTask.client.name,
                  taskTitle: mainTask.title,
                  taskDescription: mainTask.description,
                  urgency: mainTask.urgency
              }
          );
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.DESIGNER], msg);
      } catch (error) {
          console.error('Error in notifyNewProject:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Rule 2: New Subtask (Item) - Not used in bulk create, but if added individually later
  // Targets: Management, Designer
  notifyNewSubtask: async (subtask: Task) => {
      try {
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.NEW_SUBTASK,
              {
                  clientName: subtask.client.name,
                  taskTitle: subtask.title,
                  taskDescription: subtask.description,
                  urgency: subtask.urgency
              }
          );
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.DESIGNER], msg);
      } catch (error) {
          console.error('Error in notifyNewSubtask:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Rule 3: Subtask Updated (General)
  // Targets: Management, Designer
  notifySubtaskUpdate: async (subtask: Task) => {
      try {
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.SUBTASK_UPDATE,
              {
                  clientName: subtask.client.name,
                  taskTitle: subtask.title,
                  size: subtask.size,
                  printingType: subtask.printingType
              }
          );
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.DESIGNER], msg);
      } catch (error) {
          console.error('Error in notifySubtaskUpdate:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Rule 4: Subtask Specs Updated (Size / Printing Type)
  // Targets: Management, Designer
  notifySubtaskSpecsUpdate: async (subtask: Task) => {
      try {
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.SUBTASK_SPECS_UPDATE,
              {
                  clientName: subtask.client.name,
                  taskTitle: subtask.title,
                  size: subtask.size,
                  printingType: subtask.printingType
              }
          );
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.DESIGNER], msg);
      } catch (error) {
          console.error('Error in notifySubtaskSpecsUpdate:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Rule 5 & 6: Status Changes
  // Targets: Management, Print Manager
  notifyStatusChange: async (task: Task, statusId: string) => {
      let statusMsg = '';

      if (statusId === 'Design Completed') {
          statusMsg = 'تم إتمام التصميم';
      } else if (statusId === 'Montage Completed') {
          statusMsg = 'تم إتمام المونتاج';
      } else {
          // Rule 7: Other statuses (Pending, Finished, etc.) -> No Notification
          return;
      }

      try {
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.STATUS_CHANGE,
              {
                  clientName: task.client.name,
                  taskTitle: task.title,
                  statusMessage: statusMsg,
                  oldStatus: task.status,
                  newStatus: statusId
              }
          );
          
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.PRINT_MANAGER], msg);
      } catch (error) {
          console.error('Error in notifyStatusChange:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Rule 8: New Comment
  // Targets: Management, Designer, Print Manager
  notifyCommentAdded: async (task: Task) => {
      try {
          const label = task.parentId ? 'البند' : 'المهمة';
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.COMMENT_ADDED,
              {
                  clientName: task.client.name,
                  taskTitle: task.title,
                  taskLabel: label,
                  commentText: task.comments.length > 0 ? task.comments[task.comments.length - 1].text.substring(0, 50) : '',
                  commentCount: task.comments.length.toString()
              }
          );
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.DESIGNER, WhatsAppType.PRINT_MANAGER], msg);
      } catch (error) {
          console.error('Error in notifyCommentAdded:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Rule 9: Reply to Comment
  // Targets: Management, Designer, Print Manager
  notifyReplyAdded: async (task: Task) => {
      try {
          const label = task.parentId ? 'البند' : 'المهمة';
          // Get the most recent reply text from the last comment
          let replyText = '';
          if (task.comments.length > 0) {
              const lastComment = task.comments[task.comments.length - 1];
              if (lastComment.replies && lastComment.replies.length > 0) {
                  replyText = lastComment.replies[lastComment.replies.length - 1].text.substring(0, 50);
              }
          }
          
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.REPLY_ADDED,
              {
                  clientName: task.client.name,
                  taskTitle: task.title,
                  taskLabel: label,
                  commentText: replyText
              }
          );
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.DESIGNER, WhatsAppType.PRINT_MANAGER], msg);
      } catch (error) {
          console.error('Error in notifyReplyAdded:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Rule 10: Comment Resolved
  // Targets: Management, Print Manager
  notifyCommentResolved: async (task: Task) => {
      try {
          const label = task.parentId ? 'البند' : 'المهمة';
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.COMMENT_RESOLVED,
              {
                  clientName: task.client.name,
                  taskTitle: task.title,
                  taskLabel: label
              }
          );
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.PRINT_MANAGER], msg);
      } catch (error) {
          console.error('Error in notifyCommentResolved:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Rule 11: Attachments Added
  // Targets: Management, Designer, Print Manager
  notifyAttachmentAdded: async (task: Task) => {
      try {
          const label = task.parentId ? 'البند' : 'المهمة';
          const attachmentNames = task.attachments.map(a => a.name).join(', ');
          
          const msg = await TemplateService.renderTemplate(
              NotificationTemplateType.ATTACHMENT_ADDED,
              {
                  clientName: task.client.name,
                  taskTitle: task.title,
                  taskLabel: label,
                  attachmentCount: task.attachments.length.toString(),
                  attachmentNames: attachmentNames
              }
          );
          await sendToTargetGroups([WhatsAppType.MANAGEMENT, WhatsAppType.DESIGNER, WhatsAppType.PRINT_MANAGER], msg);
      } catch (error) {
          console.error('Error in notifyAttachmentAdded:', error);
          // Fallback is handled by TemplateService.renderTemplate
      }
  },

  // Test Function
  sendTestMessage: async (phoneNumber: string, apiKey: string): Promise<boolean> => {
      const message = `🔔 اختبار إشعارات MWHEBA Tasks

هذه رسالة تجريبية للتأكد من صحة إعدادات الربط.

إذا وصلت هذه الرسالة، فإن النظام يعمل بنجاح! ✅

الوقت: ${new Date().toLocaleString('ar-EG')}`.trim();
  
      console.log('Sending test to:', phoneNumber);
  
      try {
        // Use direct CallMeBot API (GET request)
        const encodedMessage = encodeURIComponent(message);
        const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${encodedMessage}&apikey=${apiKey}`;
        
        // Use fetch with no-cors mode
        await fetch(url, { 
          mode: 'no-cors',
          method: 'GET'
        });
        
        console.log('Test message request sent to CallMeBot');
        // Wait to ensure request completes
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
      } catch (error) {
        console.error('Failed to send test notification:', error);
        return false;
      }
  }
};
