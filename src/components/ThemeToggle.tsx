'use client';

import * as React from 'react';
import { Palette } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { deferComponent } from '@/lib/deferred-component';
import { whenIdle } from '@/lib/idle';

const themeMenu = deferComponent(() => import('@/components/ThemeMenu'));

const TriggerButton = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <Button ref={ref} variant="ghost" size="icon" className="size-9" {...props}>
    <Palette />
    <span className="sr-only">Toggle theme</span>
  </Button>
));
TriggerButton.displayName = 'ThemeToggleButton';

/**
 * The theme button in the header. The menu behind it (dropdown, positioning,
 * the theme list) is a separate chunk: it is fetched when the browser is
 * idle, and mounted the first time the button is pressed.
 */
export default function ThemeToggle() {
  const [requested, setRequested] = React.useState(false);
  const menuLoaded = themeMenu.useLoaded();

  React.useEffect(() => whenIdle(() => void themeMenu.load()), []);

  if (requested && menuLoaded) {
    return <themeMenu.Component trigger={<TriggerButton />} />;
  }
  return (
    <TriggerButton
      aria-haspopup="menu"
      aria-expanded="false"
      aria-busy={requested || undefined}
      onClick={() => {
        setRequested(true);
        // Normally already loaded by the idle fetch; this covers an early press.
        void themeMenu.load();
      }}
    />
  );
}
