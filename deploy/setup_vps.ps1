# ============================================================
# Jago Akademi - VPS Setup Script
# VPS: root@212.85.26.131
# ============================================================

$VPS_HOST = "212.85.26.131"
$VPS_USER = "root"
$VPS_PASS = "HalunaIT3009?"
$PROJECT_PATH = "d:\Jago Akademi Website"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  JAGO AKADEMI — VPS SETUP SCRIPT" -ForegroundColor Cyan
Write-Host "  VPS: $VPS_USER@$VPS_HOST" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Cek apakah plink tersedia
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue
if (-not $plinkPath) {
    Write-Host "`n[!] plink tidak ditemukan. Install PuTTY dulu:" -ForegroundColor Yellow
    Write-Host "    winget install PuTTY.PuTTY" -ForegroundColor Yellow
    Write-Host "    atau download dari https://putty.org" -ForegroundColor Yellow
    exit 1
}

function Run-SSH {
    param([string]$Command, [string]$Description)
    Write-Host "`n→ $Description" -ForegroundColor Green
    $result = echo y | plink -ssh -pw $VPS_PASS "$VPS_USER@$VPS_HOST" $Command 2>&1
    Write-Host $result
    return $result
}

Write-Host "`n[1/8] Test koneksi VPS..." -ForegroundColor Yellow
Run-SSH "echo 'CONNECTED OK' && uname -a" "Cek koneksi"

Write-Host "`n[2/8] Update system..." -ForegroundColor Yellow
Run-SSH "apt-get update -y && apt-get upgrade -y" "Update & upgrade packages"

Write-Host "`n[3/8] Install dependencies..." -ForegroundColor Yellow
Run-SSH "apt-get install -y curl git wget nano ufw htop certbot" "Install dependencies"

Write-Host "`n[4/8] Install Docker..." -ForegroundColor Yellow
Run-SSH "curl -fsSL https://get.docker.com | sh && systemctl enable docker && systemctl start docker" "Install Docker"

Write-Host "`n[5/8] Setup Firewall..." -ForegroundColor Yellow
Run-SSH "ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable && ufw status" "Setup UFW firewall"

Write-Host "`n[6/8] Verifikasi instalasi..." -ForegroundColor Yellow
Run-SSH "docker --version && docker compose version" "Verifikasi Docker"

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  VPS SETUP SELESAI!" -ForegroundColor Green
Write-Host "  Lanjut ke: upload project & SSL setup" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
