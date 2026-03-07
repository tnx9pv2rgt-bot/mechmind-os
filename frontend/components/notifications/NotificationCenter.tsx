/**
 * NotificationCenter Component
 * Bell icon with unread count and dropdown menu
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Settings,
  Inbox,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Notification,
  NotificationStatus,
} from '@/types/notifications';
import {
  getUnreadCount,
  getNotificationHistory,
  markAsRead,
  markAllAsRead,
} from '@/lib/services/notificationService';
import { NotificationItem } from './NotificationItem';
import Link from 'next/link';

// Props interface
interface NotificationCenterProps {
  maxItems?: number;
  pollingInterval?: number;
}

export function NotificationCenter({
  maxItems = 5,
  pollingInterval = 30000, // 30 seconds
}: NotificationCenterProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch unread count with polling
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
  });

  // Fetch recent notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () =>
      getNotificationHistory({
        page: 1,
        limit: maxItems,
      }),
    enabled: isOpen,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (notification.status === NotificationStatus.PENDING) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const recentNotifications = notificationsData?.notifications || [];

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10"
        aria-label="Notifiche"
      >
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          aria-label={`Notifiche${unreadCount > 0 ? `, ${unreadCount} non lette` : ''}`}
        >
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  variant="destructive"
                  className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Notifiche</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="h-8 text-xs"
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3 mr-1" />
                )}
                Segna tutte lette
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8"
            >
              <Link href="/notifications/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : recentNotifications.length > 0 ? (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    notification.status === NotificationStatus.PENDING
                      ? 'bg-blue-50/50'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <NotificationItem
                    notification={notification}
                    compact
                    showActions={false}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <Inbox className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                Non ci sono notifiche recenti
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-full justify-between"
          >
            <Link href="/notifications">
              Vedi tutte le notifiche
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for using notification center
export function useNotificationCenter() {
  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
  });

  return {
    unreadCount,
    refetch,
  };
}

export default NotificationCenter;
