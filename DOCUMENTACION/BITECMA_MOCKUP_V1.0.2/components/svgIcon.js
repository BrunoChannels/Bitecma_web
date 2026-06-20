function svgIcon(name){
  const icons={
    bell:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22ZM20 17h-1V11a7 7 0 1 0-14 0v6H4a1 1 0 0 0 0 2h16a1 1 0 0 0 0-2Z"/></svg>`,
    gear:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94a7.8 7.8 0 0 0 0-1.88l2.03-1.58a.8.8 0 0 0 .19-1.01l-1.92-3.32a.8.8 0 0 0-.96-.36l-2.39.96a7.56 7.56 0 0 0-1.63-.95l-.36-2.54A.8.8 0 0 0 13.3 1h-3.6a.8.8 0 0 0-.79.68l-.36 2.54a7.56 7.56 0 0 0-1.63.95l-2.39-.96a.8.8 0 0 0-.96.36L1.65 8.89a.8.8 0 0 0 .19 1.01l2.03 1.58a7.8 7.8 0 0 0 0 1.88l-2.03 1.58a.8.8 0 0 0-.19 1.01l1.92 3.32a.8.8 0 0 0 .96.36l2.39-.96c.5.38 1.05.7 1.63.95l.36 2.54a.8.8 0 0 0 .79.68h3.6a.8.8 0 0 0 .79-.68l.36-2.54c.58-.25 1.13-.57 1.63-.95l2.39.96a.8.8 0 0 0 .96-.36l1.92-3.32a.8.8 0 0 0-.19-1.01l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>`,
    search:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 18a8 8 0 1 1 5.3-14A8 8 0 0 1 10 18Zm11.7 2.3-5.2-5.2a10 10 0 1 0-1.4 1.4l5.2 5.2a1 1 0 0 0 1.4-1.4Z"/></svg>`,
    grid:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/></svg>`,
    folder:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4 12 6h8a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h6Z"/></svg>`,
    table:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 4v8h18V9H3Zm4 2h3v2H7v-2Zm0 3h3v2H7v-2Zm6-3h4v2h-4v-2Zm0 3h4v2h-4v-2Z"/></svg>`,
    archive:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18a2 2 0 0 1 2 2v3H1V5a2 2 0 0 1 2-2Zm-2 7h22v11a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V10Zm7 3a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2H8Z"/></svg>`,
    doc:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1v5h5"/></svg>`,
    users:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM8 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-3.3 0-6 1.7-6 4v2h12v-2c0-2.3-2.7-4-6-4ZM8 14c-2.8 0-5 1.4-5 3.2V20h6v-2c0-1.5.7-2.8 1.9-3.7A8.2 8.2 0 0 0 8 14Z"/></svg>`,
    map:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 9 3 3 5v16l6-2 6 2 6-2V3l-6 2Zm-6 0v14l-4 1.3V6.3L9 5Zm2 0 4 1.3v14L11 19V5Zm10 13.7-4 1.3V6l4-1.3v14Z"/></svg>`,
    logout:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17a1 1 0 0 0 1-1v-1h7a1 1 0 0 0 0-2h-7v-1a1 1 0 0 0-1.7-.7l-3 3a1 1 0 0 0 0 1.4l3 3A1 1 0 0 0 10 17ZM4 4h8a2 2 0 0 1 2 2v3a1 1 0 0 1-2 0V6H4v12h8v-3a1 1 0 0 1 2 0v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>`
  };
  return icons[name]||'';
}
