'use client';

import React from 'react';
import {
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Popover as MuiPopover,
} from '@mui/material';
import { Hexagon } from 'react-feather';
import AutoFixNormalIcon from '@mui/icons-material/AutoFixNormal';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { Rectangle as IconRect } from '@mui/icons-material';
import { Popover } from './Popover';
import useAppSelector from '@/lib/hooks/useAppSelector';
import useAppDispatch from '@/lib/hooks/useAppDispatch';
import {
  selectTool,
  selectColor,
  selectCanUndo,
  selectCanRedo,
  setTool,
  setColor,
  undo,
  redo,
} from '@/lib/redux/slices/canvas';

interface ToolButtonsProps {
  onClearAll: () => void;
  isDrawing: boolean;
}

const colors = ['red', 'green', 'blue', 'black', 'yellow', 'purple'];

export default function ToolButtons({ onClearAll, isDrawing }: ToolButtonsProps) {
  const tool = useAppSelector(selectTool);
  const color = useAppSelector(selectColor);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const dispatch = useAppDispatch();
  const [clearAllAnchor, setClearAllAnchor] = React.useState<null | HTMLElement>(null);

  const handleAlignment = (event: any, newAlignment: string) => {
    if (newAlignment === 'allclear') {
      return;
    }
    dispatch(setTool(newAlignment));
  };

  return (
    <ToggleButtonGroup
      value={tool}
      exclusive
      onChange={handleAlignment}
      aria-label="drawing tools"
    >
      <Tooltip title="Polygon (Ctrl+1)" arrow>
        <span>
          <ToggleButton
            value="polygon"
            aria-label="polygon"
            disabled={isDrawing && tool !== 'polygon'}
            sx={{ transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <Hexagon />
          </ToggleButton>
        </span>
      </Tooltip>

      <Tooltip title="Rectangle (Ctrl+2)" arrow>
        <span>
          <ToggleButton
            value="rectangle"
            aria-label="rectangle"
            disabled={isDrawing}
            sx={{ transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <IconRect />
          </ToggleButton>
        </span>
      </Tooltip>

      <Tooltip title="Arrow (Ctrl+3)" arrow>
        <span>
          <ToggleButton
            value="arrow"
            aria-label="arrow"
            disabled={isDrawing}
            sx={{ transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <ArrowRightAltIcon />
          </ToggleButton>
        </span>
      </Tooltip>

      <Tooltip title="Eraser (Ctrl+4)" arrow>
        <span>
          <ToggleButton
            value="eraser"
            aria-label="eraser"
            disabled={isDrawing}
            sx={{ transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <AutoFixNormalIcon />
          </ToggleButton>
        </span>
      </Tooltip>

      <Tooltip title="Text (Ctrl+5)" arrow>
        <span>
          <ToggleButton
            value="text"
            aria-label="text"
            disabled={isDrawing}
            sx={{ transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <TextFieldsIcon />
          </ToggleButton>
        </span>
      </Tooltip>

      <Tooltip title="Color Filler" arrow>
        <span>
          <Popover
            anchor={
              <ToggleButton
                style={{ margin: 0, height: '100%' }}
                value="colorFiller"
                aria-label="color filler"
                disabled={isDrawing}
              >
                <FormatColorFillIcon style={{ fill: color ?? 'rgba(0, 0, 0, 0.54)' }} />
              </ToggleButton>
            }
          >
            <Paper sx={(theme) => ({ padding: theme.spacing(2) })}>
              <Typography>Choose color</Typography>
              <Stack direction="row" spacing={2}>
                {colors.map((c) => (
                  <div
                    key={c}
                    onClick={() => dispatch(setColor(c))}
                    style={{
                      backgroundColor: c,
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                    }}
                    aria-label="colored"
                  />
                ))}
              </Stack>
            </Paper>
          </Popover>
        </span>
      </Tooltip>

      <Tooltip title="Clear All" placement="top-start" arrow>
        <span>
          <ToggleButton
            value="allclear"
            aria-label="clear all"
            disabled={isDrawing}
            style={{ margin: 0, height: '100%' }}
            onClick={(e) => setClearAllAnchor(e.currentTarget)}
          >
            <DeleteIcon />
          </ToggleButton>
          <MuiPopover
            open={Boolean(clearAllAnchor)}
            anchorEl={clearAllAnchor}
            onClose={() => setClearAllAnchor(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
          >
            <Paper sx={(theme) => ({ padding: theme.spacing(2) })}>
              <Typography sx={{ mb: 2 }}>Are you sure you want to clear all shapes?</Typography>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" size="small" onClick={() => setClearAllAnchor(null)}>
                  No
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="error"
                  onClick={() => {
                    onClearAll();
                    setClearAllAnchor(null);
                  }}
                >
                  Yes
                </Button>
              </Stack>
            </Paper>
          </MuiPopover>
        </span>
      </Tooltip>

      <Box sx={{ position: 'absolute', zIndex: 100, top: 80, left: 250 }}>
        <Tooltip title="Undo (Ctrl+Z)" arrow>
          <span>
            <IconButton onClick={() => dispatch(undo())} disabled={!canUndo} size="small">
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Y)" arrow>
          <span>
            <IconButton onClick={() => dispatch(redo())} disabled={!canRedo} size="small">
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </ToggleButtonGroup>
  );
}
