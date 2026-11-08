import React from 'react';
import { ImageOff, User } from 'lucide-react';

interface CandidatoAvatarProps {
  fotoUrl?: string;
  nombre?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export const CandidatoAvatar: React.FC<CandidatoAvatarProps> = ({
  fotoUrl,
  nombre,
  size = 'md',
}) => {
  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0`}>
      {fotoUrl ? (
        <img
          src={fotoUrl}
          alt={nombre ?? 'Candidato'}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-700/50">
          <User className={`w-${size === 'xs' ? '1/3' : '1/2'} h-${size === 'xs' ? '1/3' : '1/2'} text-slate-400`} />
        </div>
      )}
    </div>
  );
};
