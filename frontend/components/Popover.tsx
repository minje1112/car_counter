import * as React from 'react';
import { Popover as MuiPopover } from '@mui/material';

type Props = { anchor: React.ReactNode };
export const Popover: React.FC<React.PropsWithChildren<Props>> = ({
  anchor,
  children,
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  return (
    <>
      <div aria-describedby={id} onClick={handleClick}>
        {anchor}
      </div>

      <MuiPopover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {children}
      </MuiPopover>
    </>
  );
};
