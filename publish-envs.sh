#!/bin/bash
export PATH="/usr/local/bin:$PATH"

echo "Replacing NEXT_PUBLIC_FIREBASE_PROJECT_ID..."
npx vercel env rm NEXT_PUBLIC_FIREBASE_PROJECT_ID production --yes
echo "service-marketplace-mvp-28884" | npx vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production

echo "Replacing NEXT_PUBLIC_FIREBASE_API_KEY..."
npx vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY production --yes
echo "AIzaSyB5ZOlW9HiOya4g0nKPHW202CRUzTlf4fo" | npx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production

echo "Replacing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN..."
npx vercel env rm NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production --yes
echo "service-marketplace-mvp-28884.firebaseapp.com" | npx vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production

echo "Replacing NEXT_PUBLIC_FIREBASE_APP_ID..."
npx vercel env rm NEXT_PUBLIC_FIREBASE_APP_ID production --yes
echo "1:914462693945:web:b42780cf59888217070be8" | npx vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production

echo "Replacing NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID..."
npx vercel env rm NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production --yes
echo "G-0FSVH8LPG3" | npx vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production

echo "Replacing NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID..."
npx vercel env rm NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production --yes
echo "914462693945" | npx vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production

echo "Replacing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET..."
npx vercel env rm NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production --yes
echo "service-marketplace-mvp-28884.firebasestorage.app" | npx vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production

echo "Triggering Vercel deployment..."
npx vercel --prod --yes

echo "Deployment submitted!"
