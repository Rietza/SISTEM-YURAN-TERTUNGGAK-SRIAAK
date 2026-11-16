#!/bin/bash
# SRIAAKL - Setup Script
# Skrip ini menyediakan pangkalan data dan data dummy untuk sistem
# Usage: bash setup.sh [sqlite|supabase]

set -e

MODE="${1:-sqlite}"

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
    echo "  https://supabase.com/dashboard/project/[PROJECT_REF]/settings/database"
    echo ""
    read -p "Masukkan DATABASE_URL Supabase: " SUPABASE_URL
    cat > .env << EOF
DATABASE_URL="$SUPABASE_URL"
EOF
    # Switch schema to PostgreSQL
    echo "▸ Beralih ke schema PostgreSQL..."
    cp prisma/schema.supabase.prisma prisma/schema.prisma
  else
    # SQLite mode (default)
    mkdir -p db
    cat > .env << 'EOF'
DATABASE_URL="file:./db/custom.db"
EOF
  fi
  echo "✅ .env diwujudkan"
else
  echo "ℹ️  .env sudah wujud - langkau"
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
  echo "   atau jalankan: bun run prisma/seed.ts"
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
echo "Buka http://localhost:3000 dalam pelayar"
