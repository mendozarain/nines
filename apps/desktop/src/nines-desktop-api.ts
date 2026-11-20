export type NinesDesktopApi = {
  isDesktop: true;
  platform: NodeJS.Platform;
  version: string;
  printToPDF: () => Promise<string | null>;
};
