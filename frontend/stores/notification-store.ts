import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
}

export interface NotificationState {
  unreadCount: number;
  drawerOpen: boolean;
  notifications: Notification[];
  setUnreadCount: (n: number) => void;
  toggleDrawer: () => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadCount: 0,
  drawerOpen: false,
  notifications: [],
  setUnreadCount: (n: number): void => set({ unreadCount: n }),
  toggleDrawer: (): void => set((state) => ({ drawerOpen: !state.drawerOpen })),
  addNotification: (notification: Notification): void =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markAsRead: (id: string): void =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    }),
  markAllAsRead: (): void =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
