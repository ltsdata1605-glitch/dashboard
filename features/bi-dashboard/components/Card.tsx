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
  /** Tắt viền/bo góc/shadow của SectionCard khi Card này đã nằm sẵn trong 1 khung viền khác ở
   *  component cha (vd NhanVien.tsx bọc chung 1 viền cho tab switcher + nội dung từng tab) —
   *  tránh viền lồng viền sát nhau. Mặc định true để không đổi hành vi các nơi dùng Card độc lập. */
  bordered?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ title, icon = 'bar-chart-3', actionButton, children, noPadding = false, rounded = true, bordered = true }, ref) => {
  const body = (
    <>
      <SectionHeader title={title} icon={icon}>
        {actionButton}
      </SectionHeader>
      <div className={`${noPadding ? '' : 'p-3 lg:p-6'} relative flex-grow`}>
        {children}
      </div>
    </>
  );

  if (!bordered) {
    return (
      <div ref={ref} className="flex flex-col flex-grow">
        {body}
      </div>
    );
  }

  return (
    <SectionCard
      ref={ref}
      className="flex flex-col flex-grow"
    >
      {body}
    </SectionCard>
  );
});

Card.displayName = 'Card';

export default Card;
