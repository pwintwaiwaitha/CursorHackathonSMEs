import { describe, expect, it } from 'vitest'
import { mapAuthError } from './authErrors'

describe('mapAuthError', () => {
  it('maps invalid credentials in English and Myanmar', () => {
    const message = mapAuthError({ message: 'Invalid login credentials' })
    expect(message).toContain('Incorrect email or password')
    expect(message).toContain('အီးမေးလ်')
  })

  it('maps an already-registered email', () => {
    const message = mapAuthError('User already registered')
    expect(message).toContain('already has an account')
    expect(message).toContain('အကောင့်ရှိပြီးသား')
  })
})
