# RUNBOOK — Akses & Kunci (GitHub ↔ Local ↔ VPS)

> **Tujuan.** Satu dokumen yang menjawab: *kredensial apa yang ada, apa yang bisa dilakukannya, di
> mana ia tersimpan, dan bagaimana mencabutnya.* Diverifikasi terhadap host dan repo pada
> **9 Sep 2026** — setiap baris "terverifikasi" di sini adalah hasil perintah nyata, bukan salinan
> desain.
>
> Pemasangan kunci di host dan pembuatan GitHub Environment adalah **aksi human-gated**
> (CLAUDE.md §d.4 / SSOT §9.6). Claude Code menyiapkan seluruh config; langkah bertanda 🖐️
> dijalankan operator.

---

## 1. Peta akses

```
                    ┌───────────────────────────────────────────────┐
   Laptop (Anda /   │  gh CLI (token OAuth, keyring)  ──────────────┼──▶ GitHub repo (private)
   Claude Code)     │  ~/.ssh/id_jago_vps  ─────────────────────────┼──▶ VPS root@212.85.26.131
                    └───────────────────────────────────────────────┘
                    ┌───────────────────────────────────────────────┐
   GitHub Actions   │  secrets.DEPLOY_SSH_KEY (kunci CI khusus) ────┼──▶ VPS (deploy otomatis)
   (workflow        │  secrets.GITHUB_TOKEN (umur = 1 run) ─────────┼──▶ GHCR (pull image privat)
    Deploy)         └───────────────────────────────────────────────┘
                    ┌───────────────────────────────────────────────┐
   VPS              │  deploy key repo (sudah terpasang) ───────────┼──▶ GitHub (git pull)
                    └───────────────────────────────────────────────┘
```

Empat jalur, empat kredensial berbeda. **Tidak ada satu pun yang dipakai ulang lintas jalur** — itu
disengaja: mencabut satu jalur tidak boleh mematikan tiga lainnya.

---

## 2. Inventaris kunci

| # | Kredensial | Tersimpan di | Memberi akses ke | Status 9 Sep 2026 |
|---|-----------|--------------|------------------|-------------------|
| 1 | **Token `gh` CLI** (OAuth, akun `haluanitcore`, scope `repo`, `workflow`, `gist`, `read:org`) | Windows keyring laptop | Push, PR, Actions, secrets/variables repo | ✅ Aktif, terverifikasi |
| 2 | **`~/.ssh/id_jago_vps`** — kunci ops pribadi<br>`SHA256:0um9+TPg8On/cL64vJPnPqbkzAgwZtRpfGf0YTR3u4I` | Laptop, tanpa passphrase | `root@212.85.26.131` (SSH interaktif, ops harian) | ✅ Terpasang di host, terverifikasi (`ssh jago-vps`) |
| 3 | **`~/.ssh/jago_ci_deploy_ed25519`** — kunci CI khusus<br>`SHA256:30lf7vkkzivagciJD/SjXNjxy+Facc15Kt4bNew0rPk` | Laptop (sementara) → tujuan: GitHub secret `DEPLOY_SSH_KEY` | `root@…` untuk workflow Deploy | 🖐️ **Dibuat, BELUM dipasang** — lihat §4 |
| 4 | **Deploy key repo di VPS** | `~/.ssh/` pada host | `git pull` dari repo privat ini | ✅ Sudah ada sejak sebelumnya, terverifikasi (`ssh -T git@github.com` → *"Hi haluanitcore/Jago-Akademi-Website1!"*) |
| 5 | **`secrets.GITHUB_TOKEN`** (otomatis, umur satu run) | Tidak disimpan di mana pun | `docker login ghcr.io` di host saat deploy | ✅ Dipakai oleh `deploy.yml` sejak perubahan ini |

**Kunci yang sengaja TIDAK dibuat: PAT GHCR jangka panjang di host.** Host memang belum punya
kredensial registry sama sekali (terverifikasi: tak ada `~/.docker/config.json`), dan itu dulu berarti
`docker compose pull` pada CD akan menjawab **401 setelah gate approval terlanjur dipakai**.
Perbaikannya bukan menaruh PAT permanen di server — melainkan `deploy.yml` kini login memakai
`GITHUB_TOKEN` milik run itu sendiri lalu `docker logout` lewat `trap` di setiap jalur keluar. Token
yang bocor mati bersama run-nya; PAT di `~/.docker/config.json` bertahan berbulan-bulan.

---

## 3. Yang sudah dikerjakan (repo & laptop)

| Item | Detail |
|------|--------|
| `~/.ssh/config` | Alias **`jago-vps`** → `212.85.26.131`, user `root`, `IdentitiesOnly yes`, `BatchMode yes`. Sekarang `ssh jago-vps` cukup — tanpa flag, tanpa prompt. |
| GitHub **Variables** (11) | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` = `https://jagoakademi.com`; `API_PROXY_TARGET` = `http://api:4000`; delapan `NEXT_PUBLIC_FEATURE_*` = `false`. |
| `.github/workflows/deploy.yml` | Tambah `permissions: packages: read` + `docker login ghcr.io` di host memakai token run (§2). |
| `scripts/ops/jago.sh` | Alat status/tracking — §6. |
| `.claude/settings.json` | Allowlist perintah ops + **deny** `git push origin main`, `git push --force`, `gh pr merge` (CLAUDE.md §d.2). |

### Kenapa nilai `NEXT_PUBLIC_*` itu, bukan nilai lain

Variabel ini di-*inline saat build image*, jadi salah isi = situs salah, dan mereka sebelumnya
**kosong seluruhnya** (nol variable di repo) — artinya image hasil CD akan dibangun dengan origin API
kosong dan semua fitur mati. Nilainya diturunkan dari bukti publik, bukan tebakan: `/kelas-privat`,
`/mentor`, `/alumni`, `/portofolio-member` semuanya menjawab **404** di produksi (9 Sep 2026) ⇒
seluruh flag memang `false` saat ini. `API_PROXY_TARGET` mengikuti `apps/web/next.config.js:16-18`
(nama service compose, bukan origin publik).

> ⚠️ **Belum diisi, sengaja:** `NEXT_PUBLIC_WA_NUMBER`, `NEXT_PUBLIC_GA_ID`,
> `NEXT_PUBLIC_MIXPANEL_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`. Keempatnya kosong di produksi sekarang
> (homepage live tidak memuat satu pun tautan `wa.me/` — CTA WhatsApp memang tersembunyi karena
> `lib/config.ts` menormalkan nilai kosong jadi `null`). Mengisinya adalah keputusan owner; isi
> lewat `gh variable set` atau UI repo, lalu **rebuild** (bukan restart).

---

## 4. 🖐️ Langkah operator yang tersisa

Tiga langkah. Sampai ketiganya selesai, workflow **Deploy** belum bisa jalan — CI (`ci.yml`) tidak
terpengaruh dan tetap hijau seperti biasa.

### 4.1 Pasang kunci CI di host

```bash
# dari laptop ini
ssh jago-vps "grep -qF 'jago-ci-deploy@github-actions' ~/.ssh/authorized_keys \
  || echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILZxwn6n0T/g7NYQvwFDsmXihH/BaQVEB+P50BL0nCd6 jago-ci-deploy@github-actions' >> ~/.ssh/authorized_keys"

# verifikasi kunci CI benar-benar bisa masuk
ssh -i ~/.ssh/jago_ci_deploy_ed25519 -o IdentitiesOnly=yes root@212.85.26.131 'hostname'
```

### 4.2 Daftarkan 4 secret di repo

```bash
R=haluanitcore/Jago-Akademi-Website1
printf '212.85.26.131'        | gh secret set DEPLOY_HOST --repo $R
printf 'root'                 | gh secret set DEPLOY_USER --repo $R
printf '/var/www/jago-akademi'| gh secret set DEPLOY_PATH --repo $R
gh secret set DEPLOY_SSH_KEY --repo $R < ~/.ssh/jago_ci_deploy_ed25519
```

Setelah itu **hapus kunci privat dari laptop** — ia tak dibutuhkan lagi di sana:
`rm ~/.ssh/jago_ci_deploy_ed25519`. (Simpan `.pub` untuk pencabutan.)

### 4.3 Buat Environment `production`

Repo → **Settings → Environments → New environment** → nama `production`.

> ⚠️ **Repo ini privat di plan Free**, jadi *Required reviewers* (dan branch protection) **tidak
> tersedia** — API-nya menjawab `403 Upgrade to GitHub Pro`. Gate manusianya karena itu bersandar
> pada dua hal lain, dan keduanya nyata: `deploy.yml` hanya terpicu oleh **tag `v*`** atau
> **`workflow_dispatch`** — keduanya butuh manusia menekan sesuatu. Environment tetap harus dibuat
> karena job `deploy` merujuknya; tanpa itu job gagal start. Jika kelak upgrade ke Pro/Team,
> nyalakan *Required reviewers* dan gate-nya jadi berlapis.

Verifikasi seluruhnya sekaligus:

```bash
bash scripts/ops/jago.sh doctor    # semua baris harus OK (kecuali WARN registry, itu normal)
```

---

## 5. Rotasi & pencabutan

| Skenario | Tindakan |
|----------|----------|
| Laptop hilang | `ssh` dari mesin lain → hapus baris `Halua@HaluanITCore` dari `~/.ssh/authorized_keys` host. Lalu `gh auth logout` tak cukup — **revoke** token di GitHub → Settings → Applications. |
| Kunci CI bocor | Hapus baris `jago-ci-deploy@github-actions` dari `authorized_keys`, buat ulang (`ssh-keygen -t ed25519 -f ~/.ssh/jago_ci_deploy_ed25519 -N ""`), ulangi §4.1–4.2. |
| Kontributor keluar | Cabut akses repo; kunci host tidak terpengaruh (tak ada kunci per-orang di host selain #2). |
| Audit rutin (kuartalan) | `ssh jago-vps 'ssh-keygen -lf ~/.ssh/authorized_keys'` → cocokkan tiap sidik jari dengan tabel §2. Ada **11 kunci** di `authorized_keys` per 9 Sep 2026; sebagian besar warisan dan **belum pernah diaudit** — lihat BL-156. |

---

## 6. Perintah harian

```bash
bash scripts/ops/jago.sh status    # laptop vs origin vs VPS, container, health — cek harian
bash scripts/ops/jago.sh doctor    # kredensial & rantai akses
bash scripts/ops/jago.sh drift     # commit di main yang belum jalan di VPS
bash scripts/ops/jago.sh logs api 200
bash scripts/ops/jago.sh health    # membaca deps.redis, bukan status HTTP (lihat catatan)
bash scripts/ops/jago.sh vps 'docker compose -f docker-compose.vps.yml ps'
```

`health` sengaja membaca **`deps.redis`**, bukan kode HTTP: `routes/health.ts:44-53` mengembalikan
`ready: true` + **200** meski queue mati (nilainya `"skipped"`). Membaca status HTTP saja membuat
worker rekonsiliasi yang mati terlihat sehat sempurna — persis mode gagal yang diperingatkan
`RUNBOOK_DEPLOY.md`.

> **Temuan pertama alat ini (9 Sep 2026):** VPS berjalan di `fa0b7e5` (PR #64) sementara `origin/main`
> sudah di `bddaa9e` — **11 commit tertinggal** — PR #65/#66/#67/#68 (BL-143 kupon, BL-147 metode pembayaran,
> BL-125 dashboard afiliasi). Situs live tidak menjalankan `main`. Itu tidak terlihat dari mana pun
> sebelum ini.

---

## 7. Aturan kerja yang ditegakkan config

| Aturan (CLAUDE.md) | Ditegakkan oleh |
|--------------------|-----------------|
| Satu task = satu branch/PR | `.claude/settings.json` → `deny: git push origin main` |
| Jangan merge tanpa konfirmasi reviewer | `.claude/settings.json` → `deny: gh pr merge` |
| Deploy = aksi human-gated | `deploy.yml` hanya tag/dispatch + Environment `production` |
| Jangan pakai `docker-compose.prod.yml` di host (BL-43) | Konstanta `COMPOSE` di `jago.sh` + penjaga `docker port … 3010` di `deploy.yml` |

Branch protection **tidak** bisa dipakai di sini (plan Free + repo privat), jadi aturan pertama dan
kedua bersandar pada deny-rule agen + disiplin manusia. Itu perlindungan yang lebih lemah daripada
server-side dan sebaiknya dinyatakan apa adanya, bukan dianggap setara.

---

*Terkait: [RUNBOOK_DEPLOY.md](./RUNBOOK_DEPLOY.md) (topologi & deploy), [RUNBOOK_CI.md](./RUNBOOK_CI.md) (gate CI), [RUNBOOK_INCIDENT.md](./RUNBOOK_INCIDENT.md) (respons insiden).*
