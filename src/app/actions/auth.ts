'use server'

import { redirect } from 'next/navigation'

export async function logout() {
  redirect(`${process.env.PLATFORM_URL || 'https://madebykav.com'}/logout`)
}
