
export enum OSType {
  WINDOWS = 'Windows (.bat)',
  MACOS_LINUX = 'macOS/Linux (.sh)',
  POWERSHELL = 'PowerShell (.ps1)',
  PYTHON = 'Python (.py)'
}

export enum EmulatorType {
  MANUAL = 'Manual / Otro',
  MSI = 'MSI App Player',
  BLUESTACKS = 'BlueStacks 5'
}

export interface ADBConfig {
  ip: string;
  port: string;
  autoReconnect: boolean;
  clearExisting: boolean;
  emulatorType: EmulatorType;
  emulatorPath: string;
  includeCert: boolean;
  certPath: string;
}

export interface GeneratedScript {
  content: string;
  fileName: string;
  language: string;
}

export interface AIResponse {
  explanation: string;
  tips: string[];
}
