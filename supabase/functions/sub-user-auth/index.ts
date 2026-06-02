// Powered by OnSpace.AI
// Edge Function: sub-user authentication and data sync for phone-based users
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action } = body || {}

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'login') {
      const { phone, password } = body
      if (!phone || !password) {
        return jsonResp({ ok: false, message: 'يرجى إدخال رقم الهاتف وكلمة المرور' }, 400)
      }

      const { data: users, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('phone', String(phone).trim())

      if (error) {
        return jsonResp({ ok: false, message: 'خطأ في الاتصال بقاعدة البيانات' }, 500)
      }

      const user = (users || []).find((u: any) => u.password === password)
      if (!user) {
        return jsonResp({ ok: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' }, 200)
      }

      if (user.status === 'pending') {
        return jsonResp({ ok: false, status: 'pending', message: 'حسابك قيد المراجعة، يرجى انتظار موافقة الإدارة' }, 200)
      }
      if (user.status === 'rejected') {
        return jsonResp({ ok: false, status: 'rejected', message: 'تم رفض طلب انضمامك. تواصل مع الإدارة' }, 200)
      }
      if (!user.active) {
        return jsonResp({ ok: false, message: 'تم تعطيل حسابك من قبل الإدارة' }, 200)
      }

      const { data: dataRow } = await supabase
        .from('app_data')
        .select('data, updated_at')
        .eq('user_id', user.owner_id)
        .maybeSingle()

      return jsonResp({
        ok: true,
        user: serializeUser(user),
        blob: dataRow?.data || null,
        updatedAt: dataRow?.updated_at || null,
      }, 200)
    }

    if (action === 'request_join') {
      const { phone, password, name } = body
      if (!phone || !password || !name) {
        return jsonResp({ ok: false, message: 'الاسم ورقم الهاتف وكلمة المرور مطلوبة' }, 400)
      }

      const cleanPhone = String(phone).trim()
      const cleanName = String(name).trim()

      const { data: existing } = await supabase
        .from('app_users')
        .select('id, status')
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'pending') {
          return jsonResp({ ok: false, message: 'لديك طلب قيد المراجعة بالفعل' }, 200)
        }
        if (existing.status === 'approved') {
          return jsonResp({ ok: false, message: 'هذا الرقم مسجل بالفعل، استخدم تسجيل الدخول' }, 200)
        }
      }

      const { data: owners } = await supabase
        .from('user_profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true })
        .limit(1)

      if (!owners || owners.length === 0) {
        return jsonResp({ ok: false, message: 'لا يوجد مالك مسجل في النظام بعد' }, 200)
      }

      const ownerId = owners[0].id
      const generatedEmail = `${cleanPhone}@phone.local`

      const { error } = await supabase.from('app_users').insert({
        owner_id: ownerId,
        email: generatedEmail,
        password,
        name: cleanName,
        phone: cleanPhone,
        role: 'sales',
        active: false,
        status: 'pending',
      })

      if (error) {
        if ((error.message || '').toLowerCase().includes('duplicate')) {
          return jsonResp({ ok: false, message: 'هذا الرقم مسجل بالفعل' }, 200)
        }
        return jsonResp({ ok: false, message: error.message }, 500)
      }

      return jsonResp({ ok: true, message: 'تم إرسال طلب الانضمام بنجاح. سيتم إعلامك بمجرد الموافقة' }, 200)
    }

    if (action === 'pull') {
      const { userId } = body
      if (!userId) return jsonResp({ ok: false, message: 'بيانات الجلسة غير صحيحة' }, 400)

      const { data: user } = await supabase
        .from('app_users')
        .select('id, owner_id, status, active')
        .eq('id', userId)
        .maybeSingle()

      if (!user) return jsonResp({ ok: false, message: 'لم يتم العثور على المستخدم' }, 404)
      if (user.status !== 'approved' || !user.active) {
        return jsonResp({ ok: false, message: 'تم إنهاء صلاحياتك' }, 403)
      }

      const { data: dataRow } = await supabase
        .from('app_data')
        .select('data, updated_at')
        .eq('user_id', user.owner_id)
        .maybeSingle()

      return jsonResp({
        ok: true,
        blob: dataRow?.data || null,
        updatedAt: dataRow?.updated_at || null,
      }, 200)
    }

    if (action === 'push') {
      const { userId, blob } = body
      if (!userId || !blob) return jsonResp({ ok: false, message: 'بيانات الطلب غير صحيحة' }, 400)

      const { data: user } = await supabase
        .from('app_users')
        .select('id, owner_id, status, active')
        .eq('id', userId)
        .maybeSingle()

      if (!user) return jsonResp({ ok: false, message: 'لم يتم العثور على المستخدم' }, 404)
      if (user.status !== 'approved' || !user.active) {
        return jsonResp({ ok: false, message: 'تم إنهاء صلاحياتك' }, 403)
      }

      const now = new Date().toISOString()
      const { error } = await supabase.from('app_data').upsert(
        { user_id: user.owner_id, data: blob, updated_at: now },
        { onConflict: 'user_id' }
      )

      if (error) return jsonResp({ ok: false, message: error.message }, 500)
      return jsonResp({ ok: true, updatedAt: now }, 200)
    }

    if (action === 'check_status') {
      const { userId } = body
      if (!userId) return jsonResp({ ok: false, message: 'الجلسة غير صحيحة' }, 400)

      const { data: user } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!user) return jsonResp({ ok: false, message: 'تم حذف الحساب' }, 200)
      return jsonResp({ ok: true, user: serializeUser(user) }, 200)
    }

    return jsonResp({ ok: false, message: 'إجراء غير معروف' }, 400)
  } catch (e: any) {
    return jsonResp({ ok: false, message: String(e?.message || e) }, 500)
  }
})

function serializeUser(u: any) {
  return {
    id: u.id,
    ownerId: u.owner_id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    active: u.active,
    createdAt: u.created_at,
    approvedAt: u.approved_at,
  }
}

function jsonResp(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
