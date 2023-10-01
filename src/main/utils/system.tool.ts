import os from 'os';

export enum ComputerPlatform {
  Windows = 'win32',
  Mac = 'darwin',
  Linux = 'linux',
}

export function getPlatform(): ComputerPlatform {
  switch (os.platform()) {
    case 'darwin': // macOS
      return ComputerPlatform.Mac;
    case 'win32': // Windows
      return ComputerPlatform.Windows;
    case 'linux': // Linux
      return ComputerPlatform.Linux;
    default:
      throw new Error('Unsupported platform');
  }
}

export enum Arch {
  x64 = 'x64',
  ia32 = 'ia32',
  x86 = 'x86',
  arm = 'armv7l',
}

export function getCpuArch() {
  const ArchMap: { [key: string]: Arch } = {
    x64: Arch.x64,
    ia32: Arch.ia32,
    arm: Arch.arm,
    arm64: Arch.arm,
    arm32: Arch.arm,
  };

  return ArchMap[os.arch()] ?? Arch.x86;
}
