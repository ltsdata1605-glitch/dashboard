import { Timestamp } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';

interface NotificationPayload {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

// Port của services/notificationService.ts (client) sang Admin SDK — giữ đúng
// path `users/{uid}/notifications` để client hiện tại đọc không cần đổi gì.
export const notifyUser = async (userId: string, payload: NotificationPayload): Promise<void> => {
  const notifRef = db.collection('users').doc(userId).collection('notifications');
  await notifRef.add({
    ...payload,
    read: false,
    createdAt: Timestamp.now(),
  });
};

export const notifyAdminsAndManagers = async (departmentId: string, payload: NotificationPayload): Promise<void> => {
  const snap = await db.collection('users').where('role', 'in', ['admin', 'manager']).get();

  const targetUserIds = new Set<string>();
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.role === 'admin') {
      targetUserIds.add(docSnap.id);
    } else if (data.role === 'manager' && data.departmentId && departmentId) {
      const managerKhos: string[] = String(data.departmentId).split(',').map((x) => x.trim()).filter(Boolean);
      const reqKhos: string[] = departmentId.split(',').map((x) => x.trim()).filter(Boolean);
      if (managerKhos.some((k) => reqKhos.includes(k))) {
        targetUserIds.add(docSnap.id);
      }
    }
  });

  await Promise.all(Array.from(targetUserIds).map((uid) => notifyUser(uid, payload)));
};
