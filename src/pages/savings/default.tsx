import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import layoutStyles from './SavingsLayout.module.css';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount } from '@/models/savings';

export default function SavingsDefaultRedirect() {
    const router = useRouter();

    useEffect(() => {
        const resolveDefault = async () => {
            try {
                const res = await fetch('/api/savings/accounts');
                if (res.ok) {
                    const data: SavingsAccount[] = await res.json();
                    if (data.length === 0) {
                        router.replace('/savings');
                        return;
                    }
                    const defaultAccount = data.find(account => account.isDefault) ?? data[0];
                    router.replace(`/savings/${defaultAccount.id}`);
                    return;
                }
            } catch (error) {
                console.error('Failed to resolve default account:', error);
            }

            router.replace('/savings');
        };

        resolveDefault();
    }, [router]);

    return (
        <div className={layoutStyles.savingsContainer}>
            <Head>
                <title>MyHomeApp - Savings</title>
            </Head>
            <div className={sharedStyles.emptyState}>Loading default account...</div>
        </div>
    );
}
