import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/savings.module.css';
import { SavingsAccount } from '@/models/savings';
import SavingsAccountDetails from '@/components/savings/SavingsAccountDetails';

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
            <div className={styles.savingsContainer}>
                <Head>
                    <title>MyHomeApp - Savings</title>
                </Head>
                <div className={styles.emptyState}>Loading account...</div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className={styles.savingsContainer}>
                <Head>
                    <title>MyHomeApp - Savings</title>
                </Head>
                <div className={styles.emptyState}>
                    <p>Account not found.</p>
                    <Link href="/savings" className={styles.secondaryButton}>
                        ← Back to Savings
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.savingsContainer}>
            <Head>
                <title>MyHomeApp - {account.name}</title>
            </Head>
            <SavingsAccountDetails
                account={account}
                onBack={() => router.push('/savings')}
            />
        </div>
    );
}
