import { useState } from 'react';
import { format, addDays, isSameDay, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DateSelectionProps = {
  value: Date | undefined;
  onChange: (date: Date) => void;
};

const DateSelection = ({ value, onChange }: DateSelectionProps) => {
  const [currentDate, setCurrentDate] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const handlePrevWeek = () => {
    const prevWeekStart = subDays(currentDate, 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Prevent navigating to a week that is entirely in the past
    if (addDays(prevWeekStart, 6) < today) return;
    setCurrentDate(prevWeekStart);
  };

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentDate, i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevWeek} className="bg-white/10 border-white/20 hover:bg-white/20">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-white capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button variant="outline" size="icon" onClick={handleNextWeek} className="bg-white/10 border-white/20 hover:bg-white/20">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {days.map((day) => {
          const isSelected = value ? isSameDay(day, value) : false;
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <button
              key={day.toString()}
              type="button"
              onClick={() => !isPast && onChange(day)}
              disabled={isPast}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 h-20",
                isPast ? "bg-white/5 text-gray-500 cursor-not-allowed border-transparent" : "bg-white/5 border-white/20 hover:border-primary/50",
                isSelected && "border-primary bg-primary/10"
              )}
            >
              <span className="text-xs font-bold uppercase text-gray-400">{format(day, 'EEE', { locale: ptBR })}</span>
              <span className="text-xl font-bold text-white">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateSelection;