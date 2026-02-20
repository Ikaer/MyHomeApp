import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import layoutStyles from './SavingsLayout.module.css';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount } from '@/models/savings';
import SavingsAccountDetails from '@/components/savings/SavingsAccountDetails';
import BalanceAccountDetails from '@/components/savings/BalanceAccountDetails';
import InteressementDetails from '@/components/savings/InteressementDetails';
import { Button } from '@/components/shared';

export default function SavingsAccountPage() {
    const router = useRouter();
    const { accountId } = router.query;
    const [account, setAccount] = useState<SavingsAccount | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!accountId || Array.isArray(accountId)) return;

        const fetchAccount = async () => {
            try {
                const res = await fetch('/api/savings/accounts');
                if (res.ok) {
                    const data: SavingsAccount[] = await res.json();
                    const found = data.find(item => item.id === accountId) || null;
                    setAccount(found);
                }
            } catch (error) {
                console.error('Failed to fetch account:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAccount();
    }, [accountId]);

    if (loading) {
        return (
            <div className={layoutStyles.savingsContainer}>
                <Head>
                    <title>MyHomeApp - Savings</title>
                    <link rel="icon" href="/savings-favicon.svg" />
                </Head>
                <div className={sharedStyles.emptyState}>Loading account...</div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className={layoutStyles.savingsContainer}>
                <Head>
                    <title>MyHomeApp - Savings</title>
                    <link rel="icon" href="/savings-favicon.svg" />
                </Head>
                <div className={sharedStyles.emptyState}>
                    <p>Account not found.</p>
                    <Button href="/savings" variant="secondary">
                        ← Back to Savings
                    </Button>
                </div>
            </div>
        );
    }

    const handleBack = () => router.push('/savings');

    const renderDetails = () => {
        switch (account.type) {
            case 'PEA':
                return (
                    <SavingsAccountDetails
                        account={account}
                        onBack={handleBack}
                    />
                );
            case 'Interessement':
                return (
                    <InteressementDetails
                        account={account}
                        onBack={handleBack}
                    />
                );
            case 'CompteCourant':
            case 'PEL':
            case 'LivretA':
            case 'AssuranceVie':
                return (
                    <BalanceAccountDetails
                        account={account}
                        onBack={handleBack}
                    />
                );
            default:
                return (
                    <BalanceAccountDetails
                        account={account}
                        onBack={handleBack}
                    />
                );
        }
    };

    return (
        <div className={layoutStyles.savingsContainer}>
            <Head>
                <title>MyHomeApp - {account.name}</title>
                <link rel="icon" href="/savings-favicon.svg" />
            </Head>
            {renderDetails()}
        </div>
    );
}
