import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/useApp'
import { useAuth } from '../contexts/AuthContext'
import { resolveBankDataSource } from '../lib/bankIsolation'
import {
  confirmBankAction,
  connectBankAccount,
  disconnectBankAccount,
  loadBankSnapshot,
  snapshotAvailableBalanceMmk,
} from '../services/bankService'
import { emergencyReserveHeldMmk } from '../lib/bankBalance'
import { isBankConnectionActive } from '../lib/bankMatching'
import type { ConfirmBankActionInput, BankSnapshot } from '../services/bankTypes'
import { emptyBankSnapshot } from '../services/bankTypes'

export function useBanking() {
  const { store, isDemoMode, selectedDemoId, isReady } = useApp()
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<BankSnapshot>(emptyBankSnapshot(isDemoMode ? 'demo' : 'real'))
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const source = useMemo(
    () =>
      resolveBankDataSource({
        isDemoMode,
        selectedDemoId,
        isAuthenticated: Boolean(user),
        ownerId: user?.id ?? null,
        businessId: store.profile?.id ?? null,
      }),
    [isDemoMode, selectedDemoId, user, store.profile?.id],
  )

  const reload = useCallback(async () => {
    if (source.kind === 'unavailable') {
      setSnapshot(emptyBankSnapshot(isDemoMode ? 'demo' : 'real'))
      setStatus('ready')
      setError(source.reason)
      return
    }
    setStatus('loading')
    setError(null)
    try {
      const next = await loadBankSnapshot(source)
      setSnapshot(next)
      setStatus('ready')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Could not load business banking.')
    }
  }, [isDemoMode, source])

  useEffect(() => {
    if (!isReady) {
      return
    }
    void reload()
  }, [isReady, reload])

  const confirm = useCallback(
    async (input: ConfirmBankActionInput) => {
      const applied = await confirmBankAction(source, input)
      if (applied.result.ok) {
        setSnapshot(applied.snapshot)
        setStatus('ready')
        setError(null)
      }
      return applied.result
    },
    [source],
  )

  const connect = useCallback(async () => {
    if (source.kind === 'unavailable') {
      setError(source.reason)
      return { ok: false as const, message: source.reason }
    }
    try {
      const next = await connectBankAccount(source)
      setSnapshot(next)
      setStatus('ready')
      setError(null)
      return { ok: true as const, message: 'Demo account connected successfully' }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Could not connect the demonstration account.'
      setError(message)
      return { ok: false as const, message }
    }
  }, [source])

  const disconnect = useCallback(async () => {
    if (source.kind === 'unavailable') {
      setError(source.reason)
      return { ok: false as const, message: source.reason }
    }
    try {
      const next = await disconnectBankAccount(source)
      setSnapshot(next)
      setStatus('ready')
      setError(null)
      return { ok: true as const, message: 'Demonstration account disconnected.' }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Could not disconnect the demonstration account.'
      setError(message)
      return { ok: false as const, message }
    }
  }, [source])

  return {
    source,
    snapshot,
    status,
    error,
    isDemoMode,
    isConnected: isBankConnectionActive(snapshot.connection),
    availableBalanceMmk: snapshotAvailableBalanceMmk(snapshot),
    reserveHeldMmk: emergencyReserveHeldMmk(snapshot.transactions),
    reload,
    confirm,
    connect,
    disconnect,
  }
}
