@echo off
setlocal enabledelayedexpansion

cd /d C:\Users\matti\Desktop\Maestro

REM This is a batch script to fix the Slovenian characters in LanguageContext.tsx

REM Since PowerShell is having issues, let's try with native Node.js instead
node fix-sl-chars.js

echo Done!
