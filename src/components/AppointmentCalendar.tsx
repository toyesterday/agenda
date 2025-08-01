import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { EventClickArg } from '@fullcalendar/core';

export type AppointmentEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  resourceId: string;
  extendedProps: {
    isBlockedSlot?: false;
    appointmentData: any;
  };
  backgroundColor?: string;
  borderColor?: string;
};

export type BlockedSlotEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  resourceId: string;
  extendedProps: {
    isBlockedSlot: true;
    blockedSlotData: any;
  };
  backgroundColor?: string;
  borderColor?: string;
};

type Professional = {
  id: number;
  full_name: string;
};

type AppointmentCalendarProps = {
  appointments: any[];
  blockedSlots: any[];
  professionals: Professional[];
  onEventClick: (appointment: any) => void;
  onBlockedSlotClick: (slot: any) => void;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return '#34D399'; // Emerald 400
    case 'cancelled':
      return '#F87171'; // Red 400
    case 'confirmed':
    default:
      return 'hsl(var(--primary))';
  }
};

const AppointmentCalendar = ({ appointments, blockedSlots, professionals, onEventClick, onBlockedSlotClick }: AppointmentCalendarProps) => {
  const events: (AppointmentEvent | BlockedSlotEvent)[] = useMemo(() => {
    const appointmentEvents: AppointmentEvent[] = appointments.map(appt => ({
      id: String(appt.id),
      title: `${appt.clients?.full_name || 'Cliente'} - ${appt.service_name}`,
      start: appt.start_time,
      end: appt.end_time,
      resourceId: String(appt.professional_id),
      extendedProps: {
        appointmentData: appt,
      },
      backgroundColor: getStatusColor(appt.status),
      borderColor: getStatusColor(appt.status),
    }));

    const blockedEvents: BlockedSlotEvent[] = blockedSlots.map(slot => ({
      id: `block-${slot.id}`,
      title: slot.reason || 'Bloqueado',
      start: slot.start_time,
      end: slot.end_time,
      resourceId: String(slot.professional_id),
      extendedProps: {
        isBlockedSlot: true,
        blockedSlotData: slot,
      },
      backgroundColor: '#4b5563', // gray-600
      borderColor: '#374151', // gray-700
    }));

    return [...appointmentEvents, ...blockedEvents];
  }, [appointments, blockedSlots]);

  const resources = useMemo(() => {
    return professionals.map(prof => ({
      id: String(prof.id),
      title: prof.full_name,
    }));
  }, [professionals]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (clickInfo.event.extendedProps.isBlockedSlot) {
      onBlockedSlotClick(clickInfo.event.extendedProps.blockedSlotData);
    } else {
      onEventClick(clickInfo.event.extendedProps.appointmentData);
    }
  };

  return (
    <div className="h-[80vh]">
      <FullCalendar
        plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimeGridWeek,dayGridMonth,timeGridDay,listWeek',
        }}
        initialView="resourceTimeGridWeek"
        events={events}
        resources={resources}
        locale="pt-br"
        eventClick={handleEventClick}
        height="100%"
        nowIndicator={true}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        buttonText={{
            today:    'Hoje',
            month:    'Mês',
            week:     'Semana',
            day:      'Dia',
            list:     'Lista'
        }}
      />
    </div>
  );
};

export default AppointmentCalendar;