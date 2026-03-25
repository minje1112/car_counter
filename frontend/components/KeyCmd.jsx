'use client';

import { useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * KeyCmd Component - Handles keyboard shortcuts
 */

export default function KeyCmd({ 
  onSave, 
  onPolygon,
  onRectangle,
  onArrow,
  onEraser,
  onText,
  onColorFiller,
  onOpenFiles,
  onExport,
  disabled = false 
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when typing in input fields
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.isContentEditable ||
          disabled) {
        return;
      }

      // Check for Ctrl/Cmd key combinations
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 's':
            if (event.shiftKey) {
              event.preventDefault();
              onSave?.();
            }
            break;
          case 'o':
            event.preventDefault();
            onOpenFiles?.();
            break;
          case 'e': 

            event.preventDefault();
            onExport?.();
            break;
          case 'z':
            event.preventDefault();
            onPolygon?.();
            break;
        //   case 'x':
        //     event.preventDefault();
        //     onRectangle?.();
        //     break;
        //   case 'c':
        //     event.preventDefault();
        //     onArrow?.();
        //     break;
        //   case 'v':
        //     event.preventDefault();
        //     onEraser?.();
        //     break;
        //   case 'b':
        //     event.preventDefault();
        //     onText?.();
        //     break;
        //   case 'n':
        //     event.preventDefault();
        //     onColorFiller?.();
        //     break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, onPolygon, onRectangle, onArrow, onEraser, onText, onColorFiller, onOpenFiles, onExport, disabled]);

  return null; // This component doesn't render anything
}

KeyCmd.propTypes = {
  onSave: PropTypes.func,
  onPolygon: PropTypes.func,
  onRectangle: PropTypes.func,
  onArrow: PropTypes.func,
  onEraser: PropTypes.func,
  onText: PropTypes.func,
  onColorFiller: PropTypes.func,
  onOpenFiles: PropTypes.func,
  onExport: PropTypes.func,
  disabled: PropTypes.bool,
};

KeyCmd.defaultProps = {
  onSave: undefined,
  onPolygon: undefined,
  onRectangle: undefined,
  onArrow: undefined,
  onEraser: undefined,
  onText: undefined,
  onColorFiller: undefined,
  onOpenFiles: undefined,
  onExport: undefined,
  disabled: false,
};
