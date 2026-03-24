declare module 'react-big-calendar' {
  export const Calendar: React.ComponentType<Record<string, unknown>>;
  export function dateFnsLocalizer(config: Record<string, unknown>): unknown;
  export type View = 'month' | 'week' | 'work_week' | 'day' | 'agenda';
  export type NavigateAction = 'PREV' | 'NEXT' | 'TODAY' | 'DATE';
  export interface SlotInfo {
    start: Date;
    end: Date;
    slots: Date[];
    action: 'select' | 'click' | 'doubleClick';
  }
}

declare module 'react-big-calendar/lib/addons/dragAndDrop' {
  const withDragAndDrop: (
    calendar: React.ComponentType<Record<string, unknown>>,
  ) => React.ComponentType<Record<string, unknown>>;
  export default withDragAndDrop;
}
