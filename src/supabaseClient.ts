import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://brvzshqtfpzglvgfzvma.supabase.co'
const supabaseKey = 'sb_publishable_W2Tua_oJ_3PH-nfhnR3WbA_QrTmuG4h'

export const supabase = createClient(supabaseUrl, supabaseKey)