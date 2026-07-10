import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  title?: string;
  titleColor?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export default function Card({ title, titleColor, children, style }: CardProps) {
  return (
    <div className="card" style={style}>
      {title && (
        <div className="card-title" style={titleColor ? { color: titleColor } : undefined}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
