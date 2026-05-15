"use client";

import { useEffect, useState } from "react";

export interface PlatformKeys {
  isMac: boolean;
  mod: string;
  shift: string;
}

const DEFAULT: PlatformKeys = { isMac: false, mod: "Ctrl", shift: "Shift" };

export function usePlatformKeys(): PlatformKeys {
  const [keys, setKeys] = useState<PlatformKeys>(DEFAULT);

  useEffect(() => {
    const ua = window.navigator.userAgent || "";
    const platform = (window.navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? window.navigator.platform ?? "";
    const isMac = /Mac|iPhone|iPad|iPod/i.test(`${platform} ${ua}`);
    setKeys({
      isMac,
      mod: isMac ? "⌘" : "Ctrl",
      shift: isMac ? "⇧" : "Shift",
    });
  }, []);

  return keys;
}
