import React, { forwardRef } from 'react';
import { SectionCard } from '../../../components/shared/ui/SectionCard';
import { SectionHeader } from '../../../components/shared/ui/SectionHeader';

interface CardProps {
  title: React.ReactNode;
  icon?: string;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  rounded?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ title, icon = 'bar-chart-3', actionButton, children, noPadding = false, rounded = true }, ref) => {
  return (
    <SectionCard 
      ref={ref} 
      className="flex flex-col flex-grow"
    >
      <SectionHeader title={title} icon={icon}>
        {actionButton}
      </SectionHeader>
      <div className={`${noPadding ? '' : 'p-3 lg:p-6'} relative flex-grow`}>
        {children}
      </div>
    </SectionCard>
  );
});

Card.displayName = 'Card';

export default Card;
