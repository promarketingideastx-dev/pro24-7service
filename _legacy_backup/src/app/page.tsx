'use client';
// Refresh trigger

import React, { useState } from 'react';
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import Onboarding from "@/components/Onboarding";
import ClientIdentityOnboarding from "@/components/ClientIdentityOnboarding";
import ClientAccountView from "@/components/ClientAccountView";
import Navbar from "@/components/Navbar";
import ClientHome from "@/components/ClientHome";
import ProviderDashboard from "@/components/ProviderDashboard";

export default function Home() {
  const { country, isInitialized, role } = useAppContext();
  const { user, isProfileIncomplete, loading: authLoading } = useAuth();
  const [showAccount, setShowAccount] = useState(false);

  if (!isInitialized || authLoading) return <div className="loading">Cargando aplicación premium...</div>;

  if (!country) {
    return (
      <main className="full-screen">
        <Onboarding />
      </main>
    );
  }

  return (
    <>
      {user && isProfileIncomplete && <ClientIdentityOnboarding />}
      {showAccount && user && <ClientAccountView onClose={() => setShowAccount(false)} />}
      <Navbar onAccountClick={() => setShowAccount(true)} />
      <main>
        {role === 'client' ? (
          <ClientHome />
        ) : (
          <ProviderDashboard />
        )}
      </main>
    </>
  );
}
