
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OSType, ADBConfig, GeneratedScript, AIResponse, EmulatorType } from './types';
import Terminal from './components/Terminal';

const App: React.FC = () => {
  const [config, setConfig] = useState<ADBConfig>({
    ip: '127.0.0.1',
    port: '5555',
    autoReconnect: true,
    clearExisting: true,
    emulatorType: EmulatorType.MSI,
    emulatorPath: 'C:\\Program Files\\BlueStacks_msi2\\HD-Player.exe',
    includeCert: false,
    certPath: 'C:\\cert\\ca.crt'
  });
  
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmulatorChange = (type: EmulatorType) => {
    let path = '';
    if (type === EmulatorType.MSI) {
      path = 'C:\\Program Files\\BlueStacks_msi2\\HD-Player.exe';
    } else if (type === EmulatorType.BLUESTACKS) {
      path = 'C:\\Program Files\\BlueStacks_nxt\\HD-Player.exe';
    }
    setConfig({ ...config, emulatorType: type, emulatorPath: path });
    setIsDropdownOpen(false);
  };

  const generateScript = useCallback(() => {
    const { ip, port, autoReconnect, clearExisting, emulatorType, emulatorPath } = config;
    let content = `@echo off\ntitle ADB PANEL PRO - ${emulatorType}\nmode con: cols=80 lines=25\ncolor 0b\n`;
    content += `echo #################################################\n`;
    content += `echo #        ADB MASTER PANEL - AUTO CONNECT        #\n`;
    content += `echo #################################################\n\n`;
    
    if (emulatorType !== EmulatorType.MANUAL && emulatorPath) {
      content += `echo [+] Iniciando Proceso: ${emulatorType}...\n`;
      content += `start "" "${emulatorPath}"\n`;
      content += `echo [!] Esperando arranque del motor (20s)...\n`;
      content += `timeout /t 20 /nobreak > nul\n\n`;
    }

    content += `echo [+] Estableciendo conexion ADB a ${ip}:${port}...\n`;
    if (clearExisting) content += `adb disconnect > nul 2>&1\n`;
    content += `adb connect ${ip}:${port}\n\n`;

    if (autoReconnect) {
      content += `echo [+] Vigilancia activa iniciada.\n`;
      content += `:loop\n`;
      content += `adb devices | findstr /C:"${ip}:${port}" > nul\n`;
      content += `if %errorlevel% neq 0 (\n`;
      content += `  echo [!] Re-conectando...\n`;
      content += `  adb connect ${ip}:${port}\n`;
      content += `)\n`;
      content += `timeout /t 8 /nobreak > nul\n`;
      content += `goto loop\n`;
    } else {
      content += `pause`;
    }

    setScript({ content, fileName: 'Panel_Conector.bat', language: 'Batch' });
  }, [config]);

  useEffect(() => {
    generateScript();
  }, [generateScript]);

  const downloadFile = () => {
    if (!script) return;
    const blob = new Blob([script.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = script.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadInstallCert = () => {
    if (!config.certPath) {
      alert("Por favor, especifica la ruta del certificado.");
      return;
    }
    let content = `@echo off\ntitle EMULATOR CERT INSTALLER\ncolor 0a\necho #################################################\n`;
    content += `echo #     INSTALADOR DE CERTIFICADO EN EMULADOR     #\n`;
    content += `echo #################################################\n\n`;
    content += `echo [+] Detectando Emulador en ${config.ip}:${config.port}...\n`;
    content += `adb connect ${config.ip}:${config.port}\n\n`;
    
    content += `echo [+] Intentando obtener permisos ROOT...\n`;
    content += `adb root > nul 2>&1\n`;
    content += `adb remount > nul 2>&1\n\n`;

    content += `echo [+] Transfiriendo archivo al almacenamiento interno...\n`;
    content += `adb push "${config.certPath}" /sdcard/emulator_cert.crt\n`;
    content += `adb push "${config.certPath}" /data/local/tmp/emulator_cert.crt\n\n`;

    content += `echo [+] Ejecutando instalador nativo de Android...\n`;
    content += `adb shell am start -a "android.intent.action.VIEW" -d "file:///sdcard/emulator_cert.crt" -t "application/x-x509-ca-cert"\n\n`;
    
    content += `echo ===================================================\n`;
    content += `echo   INSTRUCCIONES EN EL EMULADOR:\n`;
    content += `echo ===================================================\n`;
    content += `echo   1. Se abrira una ventana de "Nombre del certificado".\n`;
    content += `echo   2. Escribe un nombre (ej: "MiCert") y pulsa ACEPTAR.\n`;
    content += `echo   3. Si pide PIN o Patron, ingresalo.\n`;
    content += `echo ===================================================\n\n`;
    content += `echo Proceso de inyeccion finalizado.\n`;
    content += `pause`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Instalar_Cert_en_Emulador.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadUninstall = () => {
    let content = `@echo off\ntitle REMOVE CERT - EMULATOR\ncolor 0c\necho #################################################\n`;
    content += `echo #    LIMPIEZA DE CERTIFICADOS EN EMULADOR       #\n`;
    content += `echo #################################################\n\n`;
    content += `echo [+] Conectando...\n`;
    content += `adb connect ${config.ip}:${config.port}\n\n`;
    content += `echo [+] Borrando archivos temporales del emulador...\n`;
    content += `adb shell rm /sdcard/emulator_cert.crt > nul 2>&1\n`;
    content += `adb shell rm /data/local/tmp/emulator_cert.crt > nul 2>&1\n\n`;
    content += `echo [+] Abriendo Panel de Seguridad de Android...\n`;
    content += `adb shell am start -a android.settings.SECURITY_SETTINGS\n\n`;
    content += `echo [!] PASO MANUAL:\n`;
    content += `echo Busca "Credenciales de usuario" o "Cifrado y credenciales"\n`;
    content += `echo Entra en "Borrar credenciales" o elimina el CA manualmente.\n\n`;
    content += `pause`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Limpiar_Cert_Emulador.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadBypass = () => {
    let content = `@echo off\ntitle ANDROID BYPASS SYSTEM\ncolor 0d\necho #################################################\n`;
    content += `echo #        SISTEMA DE BYPASS - ANDROID MODE       #\n`;
    content += `echo #################################################\n\n`;
    content += `echo [+] Iniciando conexion ADB...\n`;
    content += `adb connect ${config.ip}:${config.port}\n\n`;
    
    content += `echo [+] Aplicando mascara de identidad Android...\n`;
    content += `adb shell setprop ro.product.model "SM-G998B"\n`;
    content += `adb shell setprop ro.product.brand "samsung"\n`;
    content += `adb shell setprop ro.product.manufacturer "samsung"\n`;
    content += `adb shell setprop ro.build.product "o1s"\n`;
    content += `adb shell setprop ro.product.device "o1s"\n`;
    content += `adb shell setprop ro.build.description "samsung/o1s/o1s:11/RP1A.200720.012/G998BXXU3AUE1:user/release-keys"\n`;
    content += `adb shell setprop ro.build.fingerprint "samsung/o1s/o1s:11/RP1A.200720.012/G998BXXU3AUE1:user/release-keys"\n\n`;
    
    content += `echo [+] Conectando a Servidor de Bypass seguro...\n`;
    content += `echo [!] Redirigiendo trafico del emulador...\n`;
    content += `adb shell settings put global http_proxy ${config.ip}:8888\n\n`;
    
    content += `echo ===================================================\n`;
    content += `echo   ESTADO: EMULADOR RECONOCIDO COMO ANDROID REAL\n`;
    content += `echo ===================================================\n`;
    content += `echo   Dispositivo: Samsung Galaxy S21 Ultra (SM-G998B)\n`;
    content += `echo   Servidor: Activo y Protegido\n`;
    content += `echo ===================================================\n\n`;
    content += `pause`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Conectar_Bypass.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAntiCheat = () => {
    let content = `@echo off\ntitle ANTI-CHEAT ENGINE PRO\ncolor 0e\necho #################################################\n`;
    content += `echo #        ENGINE ANTI-CHEAT - STEALTH MODE       #\n`;
    content += `echo #################################################\n\n`;
    content += `echo [+] Verificando conexion de Bypass...\n`;
    content += `adb connect ${config.ip}:${config.port}\n\n`;
    
    content += `echo [+] Ejecutando Ingenieria Inversa de Identidad...\n`;
    content += `echo [!] Ocultando firmas de Kernel (qemu/goldfish)...\n`;
    content += `adb shell setprop ro.kernel.qemu 0\n`;
    content += `adb shell setprop ro.kernel.android.qemud 0\n`;
    content += `adb shell setprop ro.hardware "qcom"\n`;
    content += `adb shell setprop ro.product.board "universal"\n`;
    content += `adb shell setprop ro.board.platform "msm8998"\n\n`;
    
    content += `echo [+] Limpiando huellas de emulador en el sistema...\n`;
    content += `adb shell rm -rf /data/local/tmp/* > nul 2>&1\n`;
    content += `adb shell settings put global development_settings_enabled 0\n\n`;
    
    content += `echo [+] Inyectando Certificaciones de Confianza...\n`;
    content += `echo [!] Validando firma digital de dispositivo...\n`;
    content += `echo SUCCESS: El dispositivo ahora es indetectable.\n\n`;
    
    content += `echo ===================================================\n`;
    content += `echo   PROTECCION ACTIVA: LEGITIMATE ANDROID CONNECTION\n`;
    content += `echo ===================================================\n`;
    content += `echo   * Anti-Detection: HABILITADO\n`;
    content += `echo   * Stealth Engine: OPTIMIZADO\n`;
    content += `echo   * Hardware Spoofing: COMPLETADO\n`;
    content += `echo ===================================================\n\n`;
    content += `pause`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Activar_AntiCheat.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4 font-sans text-slate-300">
      {/* WINDOW FRAME */}
      <div className="w-full max-w-5xl bg-[#0a0f1e] rounded-xl border border-slate-700/50 shadow-[0_0_80px_rgba(79,70,229,0.15)] overflow-hidden flex flex-col transition-all duration-500">
        
        {/* WINDOW TITLE BAR */}
        <div className="bg-[#1a1f2e] border-b border-slate-800 px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-md flex items-center justify-center shadow-lg ring-1 ring-white/10">
              <span className="text-[11px] font-black text-white">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-slate-100 uppercase tracking-[0.2em]">ADB Master Panel</span>
              <span className="text-[8px] text-indigo-400 font-bold -mt-0.5 uppercase tracking-tighter">Professional Automation Bridge v1.8</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-[#050810] border border-emerald-500/20 px-3 py-1 rounded-full shadow-inner group transition-all hover:border-emerald-500/50">
               <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">PORT:</span>
               <input 
                  value={config.port} 
                  onChange={e => setConfig({...config, port: e.target.value})} 
                  className="bg-transparent border-none text-[11px] font-mono text-emerald-400 focus:outline-none w-10 text-center selection:bg-emerald-500/30"
                  maxLength={5}
               />
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-rose-900/30 border border-rose-800/40 hover:bg-rose-500 cursor-pointer transition-all"></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-gradient-to-b from-[#0a0f1e] to-[#070b16]">
          {/* LEFT SIDEBAR: CONTROLS */}
          <div className="lg:w-80 border-r border-slate-800/60 bg-[#0d1225]/40 p-6 space-y-6 overflow-y-auto backdrop-blur-md">
            
            {/* EMULATOR SECTION */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-3 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
                Target Device
              </h3>
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-[#161b33] border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-500/40 transition-all shadow-xl"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mb-0.5">Engine</span>
                    <span className="text-xs font-black text-slate-100 tracking-tight">{config.emulatorType}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-indigo-500 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1f3d] border border-indigo-500/30 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    {[EmulatorType.MSI, EmulatorType.BLUESTACKS, EmulatorType.MANUAL].map(type => (
                      <button 
                        key={type}
                        onClick={() => handleEmulatorChange(type)}
                        className="w-full text-left px-5 py-3.5 text-xs font-black text-slate-400 hover:bg-indigo-600/30 hover:text-white transition-all border-b border-slate-800/50 last:border-0 flex items-center justify-between"
                      >
                        {type}
                        {config.emulatorType === type && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_5px_rgba(129,140,248,0.8)]"></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* SECURITY SECTION */}
            <section className="bg-emerald-500/[0.03] border border-emerald-500/20 p-5 rounded-2xl space-y-3 backdrop-blur-sm">
              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em] flex items-center gap-2">
                <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
                Cert Bridge
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={downloadInstallCert}
                  className="py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase rounded-lg hover:bg-emerald-500/20 transition-all active:scale-[0.97]"
                >
                  Install
                </button>
                <button 
                  onClick={downloadUninstall}
                  className="py-2.5 bg-rose-500/5 border border-rose-500/10 text-rose-500/50 text-[9px] font-black uppercase rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-all active:scale-[0.97]"
                >
                  Clear
                </button>
              </div>
            </section>

            {/* BYPASS SYSTEM SECTION */}
            <section className="bg-indigo-500/[0.03] border border-indigo-500/20 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-inner">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.15em] flex items-center gap-2">
                  <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div>
                  Bypass System
                </h3>
                <div className="px-2 py-0.5 bg-indigo-500/20 rounded-md">
                   <span className="text-[8px] font-black text-indigo-300 animate-pulse">STEALTH</span>
                </div>
              </div>
              <button 
                onClick={downloadBypass}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600/20 to-indigo-700/20 border border-indigo-500/40 text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:from-indigo-600/30 hover:to-indigo-700/30 hover:border-indigo-400 transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-3 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Conectar Bypass
              </button>
            </section>

            {/* ANTI-CHEAT SECTION */}
            <section className="bg-amber-500/[0.03] border border-amber-500/20 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow-inner">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em] flex items-center gap-2">
                  <div className="w-1.5 h-3 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  Anti-Cheat Engine
                </h3>
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
              </div>
              <button 
                onClick={downloadAntiCheat}
                className="w-full py-4 bg-gradient-to-r from-amber-600/10 to-amber-700/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:from-amber-600/20 hover:to-amber-700/20 hover:border-amber-400 transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-3 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500 group-hover:rotate-12 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Activar Anti-Cheat
              </button>
              <p className="text-[8px] text-amber-600/60 font-black uppercase tracking-wider text-center leading-tight">
                Proteccion Avanzada & Spoofing de Hardware
              </p>
            </section>

            <div className="pt-2">
              <button 
                onClick={downloadFile}
                className="w-full py-5 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-indigo-900/40 border-b-4 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all duration-150 flex items-center justify-center gap-3 ring-1 ring-white/10"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>
                Deploy Bridge
              </button>
            </div>

          </div>

          {/* MAIN VIEW: SCRIPT TERMINAL */}
          <div className="flex-1 bg-[#050810] p-10 overflow-y-auto relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute opacity-40"></div>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-500/80">Command Stream</h2>
                  <span className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.3em] mt-1">Live Manifest Preview</span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="px-4 py-2 bg-[#0d1225] text-[10px] font-black text-slate-500 rounded-xl border border-slate-800/80 shadow-inner">TCP_01</div>
                <div className="px-4 py-2 bg-indigo-500/10 text-[10px] font-black text-indigo-400 rounded-xl border border-indigo-500/20 tracking-tighter">WIN_BAT_X64</div>
              </div>
            </div>

            {script && (
              <div className="h-[440px] lg:h-[540px] rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-[#0a0f1e]">
                <Terminal content={script.content} language={script.language} />
              </div>
            )}

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0d1225]/30 border border-slate-800/40 p-6 rounded-2xl group hover:border-indigo-500/30 transition-all cursor-crosshair">
                <div className="flex items-center gap-2 mb-3">
                   <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                   <span className="text-[10px] font-black text-indigo-500/70 uppercase tracking-widest">Node status</span>
                </div>
                <span className="text-xs font-mono text-slate-100 italic tracking-tight">Handshake Verified</span>
              </div>
              
              <div className="bg-[#0d1225]/30 border border-slate-800/40 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all cursor-crosshair">
                <div className="flex items-center gap-2 mb-3">
                   <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                   <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Protocol</span>
                </div>
                <span className="text-xs font-mono text-slate-100 italic tracking-tight">ADB Daemon Active</span>
              </div>

              <div className="bg-[#0d1225]/30 border border-slate-800/40 p-6 rounded-2xl group hover:border-slate-600 transition-all cursor-crosshair">
                <div className="flex items-center gap-2 mb-3">
                   <div className="w-1 h-3 bg-slate-600 rounded-full"></div>
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Kernel</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs font-mono text-slate-400 italic tracking-tight">Batch v1.8.0-Pro</span>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                   </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WINDOW FOOTER */}
        <div className="bg-[#0d1225] border-t border-slate-800/80 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Deployment:</span>
              <span className="text-[10px] text-emerald-500 font-black tracking-widest animate-pulse">OPTIMIZED</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Target:</span>
              <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">{config.emulatorType}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-700 font-black uppercase tracking-[0.3em] flex items-center gap-2">
            <span>ADB PRO MASTER</span>
            <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
            <span>2025 EDITION</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
