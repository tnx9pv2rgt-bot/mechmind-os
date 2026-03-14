'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  MousePointer2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhotoAnnotation } from '@/types/inspection';

interface PhotoAnnotatorProps {
  imageUrl: string;
  initialAnnotations?: PhotoAnnotation[];
  onSave: (annotations: PhotoAnnotation[]) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

export function PhotoAnnotator({
  imageUrl,
  initialAnnotations = [],
  onSave,
  onCancel,
  readOnly = false,
}: PhotoAnnotatorProps) {
  const [annotations, setAnnotations] = useState<PhotoAnnotation[]>(initialAnnotations);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [arrowDirection, setArrowDirection] = useState<PhotoAnnotation['arrowDirection']>('down');
  const imageRef = useRef<HTMLDivElement>(null);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly || !isAdding || !imageRef.current) return;

      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newAnnotation: PhotoAnnotation = {
        id: `ann-${Date.now()}`,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        text: newText || 'Annotazione',
        color: '#ef4444',
        arrowDirection,
      };

      setAnnotations([...annotations, newAnnotation]);
      setIsAdding(false);
      setNewText('');
    },
    [isAdding, newText, arrowDirection, annotations, readOnly]
  );

  const handleDelete = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id));
    setSelectedAnnotation(null);
  };

  const handleUpdateText = (id: string, text: string) => {
    setAnnotations(annotations.map(a => (a.id === id ? { ...a, text } : a)));
  };

  return (
    <div className='flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden'>
      {/* Toolbar */}
      {!readOnly && (
        <div className='flex items-center gap-2 p-3 bg-gray-800 border-b border-gray-700'>
          {!isAdding ? (
            <>
              <Button
                size='sm'
                variant='secondary'
                onClick={() => setIsAdding(true)}
                className='gap-2'
              >
                <MousePointer2 className='h-4 w-4' />
                Aggiungi Annotazione
              </Button>

              <div className='h-6 w-px bg-gray-600 mx-2' />

              <span className='text-xs text-gray-400'>Direzione freccia:</span>
              <div className='flex gap-1'>
                {(['up', 'down', 'left', 'right'] as const).map(dir => (
                  <Button
                    key={dir}
                    size='icon'
                    variant={arrowDirection === dir ? 'default' : 'ghost'}
                    className='h-8 w-8'
                    onClick={() => setArrowDirection(dir)}
                  >
                    {dir === 'up' && <ArrowUp className='h-4 w-4' />}
                    {dir === 'down' && <ArrowDown className='h-4 w-4' />}
                    {dir === 'left' && <ArrowLeft className='h-4 w-4' />}
                    {dir === 'right' && <ArrowRight className='h-4 w-4' />}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <input
                type='text'
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder='Testo annotazione...'
                className='flex-1 px-3 py-1.5 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none'
                autoFocus
              />
              <span className='text-xs text-gray-400'>Clicca sull&apos;immagine</span>
              <Button size='sm' variant='ghost' onClick={() => setIsAdding(false)}>
                <X className='h-4 w-4' />
              </Button>
            </>
          )}

          <div className='flex-1' />

          <Button size='sm' variant='ghost' onClick={onCancel}>
            Annulla
          </Button>
          <Button size='sm' onClick={() => onSave(annotations)}>
            <Save className='h-4 w-4 mr-2' />
            Salva
          </Button>
        </div>
      )}

      {/* Image Container */}
      <div
        ref={imageRef}
        className={cn(
          'relative flex-1 overflow-hidden bg-black',
          isAdding && !readOnly && 'cursor-crosshair'
        )}
        onClick={handleImageClick}
      >
        <img src={imageUrl} alt='Vehicle inspection' className='w-full h-full object-contain' />

        {/* Annotations */}
        {annotations.map(annotation => (
          <div
            key={annotation.id}
            className='absolute transform -translate-x-1/2 -translate-y-1/2'
            style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
            onClick={e => {
              e.stopPropagation();
              setSelectedAnnotation(annotation.id);
            }}
          >
            {/* Dot */}
            <div
              className={cn(
                'w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform',
                selectedAnnotation === annotation.id && 'scale-125'
              )}
              style={{ backgroundColor: annotation.color }}
            />

            {/* Arrow */}
            {annotation.arrowDirection && (
              <div
                className='absolute text-white drop-shadow-md'
                style={{
                  ...(annotation.arrowDirection === 'up' && {
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }),
                  ...(annotation.arrowDirection === 'down' && {
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }),
                  ...(annotation.arrowDirection === 'left' && {
                    right: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }),
                  ...(annotation.arrowDirection === 'right' && {
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }),
                }}
              >
                {annotation.arrowDirection === 'up' && <ArrowUp className='h-5 w-5' />}
                {annotation.arrowDirection === 'down' && <ArrowDown className='h-5 w-5' />}
                {annotation.arrowDirection === 'left' && <ArrowLeft className='h-5 w-5' />}
                {annotation.arrowDirection === 'right' && <ArrowRight className='h-5 w-5' />}
              </div>
            )}

            {/* Label */}
            {(selectedAnnotation === annotation.id || readOnly) && (
              <div
                className={cn(
                  'absolute whitespace-nowrap px-2 py-1 rounded text-xs font-medium shadow-lg',
                  'bg-white text-gray-900 border border-gray-200'
                )}
                style={{
                  ...(annotation.arrowDirection === 'up' && { bottom: '140%' }),
                  ...(annotation.arrowDirection === 'down' && { top: '140%' }),
                  ...(annotation.arrowDirection === 'left' && { right: '140%' }),
                  ...(annotation.arrowDirection === 'right' && { left: '140%' }),
                  ...(!annotation.arrowDirection && { top: '140%' }),
                }}
              >
                {selectedAnnotation === annotation.id && !readOnly ? (
                  <div className='flex items-center gap-2'>
                    <input
                      type='text'
                      value={annotation.text}
                      onChange={e => handleUpdateText(annotation.id, e.target.value)}
                      className='bg-transparent border-none p-0 text-xs focus:outline-none w-32'
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(annotation.id);
                      }}
                      className='text-red-500 hover:text-red-700'
                    >
                      <Trash2 className='h-3 w-3' />
                    </button>
                  </div>
                ) : (
                  annotation.text
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className='p-3 bg-gray-800 border-t border-gray-700 text-xs text-gray-400'>
        {annotations.length} annotazioni • Clicca su un punto per modificarlo
      </div>
    </div>
  );
}
