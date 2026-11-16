#!/bin/bash
# SRIAAKL - Setup Script
# Skrip ini menyediakan pangkalan data dan data dummy untuk sistem
# Usage: bash setup.sh [sqlite|supabase]

set -e

MODE="${1:-supabase}"

echo "═══════════════════════════════════════════════════════════════════"
echo "  SRIAAKL Setup - Sistem Pemantauan Tunggakan Yuran Murid"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Mod: $MODE"
echo ""

# Check dependencies
if ! command -v bun &> /dev/null; then
  echo "❌ bun tidak dijumpai. Sila pasang bun terlebih dahulu:"
  echo "   curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

# Install dependencies
echo "▸ Memasang dependencies..."
bun install

# Configure .env based on mode
if [ ! -f .env ]; then
  echo "▸ Mewujudkan .env..."
  if [ "$MODE" = "supabase" ]; then
    # Supabase mode - prompt for connection string
    echo ""
    echo "Untuk Supabase, dapatkan connection string dari:"
    echo "  https://supabase.com/dashboard/project/bcovngbahyygvlcgctoc/settings/database"
    echo ""
    echo "Format (direct):"
    echo "  postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
    echo ""
    read -p "Masukkan DATABASE_URL Supabase (atau tekan Enter untuk default): " SUPABASE_URL
    if [ -z "$SUPABASE_URL" ]; then
      SUPABASE_URL="postgresql://postgres:Riezamahmood1211@db.bcovngbahyygvlcgctoc.supabase.co:5432/postgres"
      echo "ℹ️  Menggunakan default: $SUPABASE_URL"
    fi
    cat > .env << EOF
DATABASE_URL="$SUPABASE_URL"
EOF
    # Default schema is already PostgreSQL (matches default prisma/schema.prisma)
    echo "ℹ️  Schema PostgreSQL (prisma/schema.prisma) - tiada perubahan diperlukan"
  else
    # SQLite mode (untuk dev tempatan sahaja)
    mkdir -p db
    cat > .env << 'EOF'
DATABASE_URL="file:./db/custom.db"
EOF
    # Switch schema to SQLite
    echo "▸ Beralih ke schema SQLite..."
    cp prisma/schema.sqlite.prisma prisma/schema.prisma
  fi
  echo "✅ .env diwujudkan"
else
  echo "ℹ️  .env sudah wujud - langkau"
  # If sqlite mode and current schema is postgresql, switch
  if [ "$MODE" = "sqlite" ]; then
    if grep -q 'provider = "postgresql"' prisma/schema.prisma 2>/dev/null; then
      echo "▸ Beralih ke schema SQLite..."
      cp prisma/schema.sqlite.prisma prisma/schema.prisma
    fi
  fi
fi

# Generate Prisma client
echo "▸ Menjana Prisma client..."
bun run db:generate

# Push schema to database
echo "▸ Push schema ke database..."
bun run db:push

# Seed database
echo "▸ Jana data dummy (300 murid, 7200 invois, ~5700 bayaran)..."
if [ "$MODE" = "supabase" ]; then
  echo "ℹ️  Untuk Supabase, jana data via SQL Editor dengan supabase-seed.sql"
  echo "   ATAU jalankan: bun run prisma/seed.ts"
  read -p "Jana data sekarang via Prisma? (y/N): " jana
  if [ "$jana" = "y" ] || [ "$jana" = "Y" ]; then
    bun run prisma/seed.ts
  fi
else
  bun run prisma/seed.ts
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  ✅ SETUP SELESAI!"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Akaun Demo:"
echo "  Pentadbir: pentadbir@sriaakl.edu.my / pentadbir123"
echo "  Bendahari: bendahari@sriaakl.edu.my / bendahari123"
echo "  Pengetua:  pengetua@sriaakl.edu.my / pengetua123"
echo "  Guru:      guru1@sriaakl.edu.my / guru123"
echo ""
echo "Mulakan aplikasi:"
echo "  bun run dev"
echo ""
if [ "$MODE" = "supabase" ]; then
  echo "Untuk deploy ke Vercel:"
  echo "  1. Add Environment Variable di Vercel Dashboard:"
  echo "     Key: DATABASE_URL"
  echo "     Value: (sama seperti dalam .env anda)"
  echo "  2. Redeploy"
fi
