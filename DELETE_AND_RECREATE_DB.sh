#!/bin/bash
# Script to delete and recreate the Railway database with correct schema
# Run this in Railway Shell ONCE to fix the 502 errors

echo "🗑️  Deleting old database..."

# Delete the existing database file
rm -f /data/giraffe_kitchens.db
rm -f /data/giraffe_kitchens.db-shm
rm -f /data/giraffe_kitchens.db-wal

echo "✅ Old database deleted"
echo ""
echo "🔄 The application will recreate the database on next restart"
echo ""
echo "📋 Next steps:"
echo "   1. Exit this shell"
echo "   2. Go to Railway Dashboard"
echo "   3. Click 'Restart' on your service"
echo "   4. The app will run migrations and seed data automatically"
echo "   5. Database will have the correct schema with manager_name column"
