'use strict';
(function () {
  const SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';
  const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const HERO_IMG = {
    arakni_m:'icon_arakni_m.webp',       arakni_sttc:'icon_arakni_sttc-1.webp',
    arakni_th:'icon_arakni_th-1.webp',   aurora:'icon_aurora.webp',
    aurora_lot:'icon_aurora_lot-2.webp', azalea:'icon_azalea.webp',
    baalghor:'icon_baalghor_oote.webp',  benji:'icon_benji.webp',
    betsy:'icon_betsy.webp',             blaze:'icon_blaze.webp',
    boltyn:'icon_boltyn.webp',           bravo_s:'icon_bravo_s.webp',
    bravo_fs:'icon_bravo_fs.webp',       bravo_sots:'icon_bravo_sots.webp',
    brevant:'icon_brevant.webp',         briar:'icon_briar.webp',
    chane:'icon_chane.webp',             cindra:'icon_cindra.webp',
    dash_ie:'icon_dash_ie.webp',         dash_io:'icon_dash_io.webp',
    datadoll:'icon_datadoll.webp',       dorinthea:'icon_dorinthea.webp',
    dromai:'icon_dromai.webp',           emperor:'icon_emperor.webp',
    enigma:'icon_enigma.webp',           fai:'icon_fai.webp',
    fang:'icon_fang.webp',               florian:'icon_florian.webp',
    frankie:'icon_frankie.webp',         genis:'icon_genis.webp',
    gravybones:'icon_gravybones.webp',   hala:'icon_hala_pos.webp',
    ira:'icon_ira.webp',                 iyslander:'icon_iyslander.webp',
    jarl:'icon_jarl.webp',               kano:'icon_kano.webp',
    kassai_cs:'icon_kassai_cs.webp',     kassai_gs:'icon_kassai_gs.webp',
    katsu:'icon_katsu.webp',             kavdaen:'icon_kavdaen.webp',
    kayo_ad:'icon_kayo_ad.webp',         kayo_br:'icon_kayo_br_resized.png',
    kayo_uc:'icon_kayo_uc-2.webp',       levia:'icon_levia.webp',
    lexi:'icon_lexi.webp',               lyath:'icon_lyath-2.webp',
    marlynn:'icon_marlynn.webp',         maxxnitro:'icon_maxxnitro.webp',
    melody:'icon_melody.webp',           nuu:'icon_nuu.webp',
    oldhim:'icon_oldhim-1.webp',         olympia:'icon_olympia.webp',
    oscilio:'icon_oscillio.webp',        oscilio_fc:'icon_oscilio_fc-1.webp',
    pleiades:'icon_pleiades-1.webp',     prism_soa:'icon_prism_soa.webp',
    prism_aos:'icon_prism_aos.webp',     puffin:'icon_puffin.webp',
    rhinar:'icon_rhinar_rr-1.webp',      riptide:'icon_riptide.webp',
    scurv:'icon_scurv.webp',             shiyana:'icon_shiyana.webp',
    teklovossen:'icon_teklovossen.webp', terra:'icon_terra.webp',
    tuffnut:'icon_tuffnut-1.webp',       uzuri:'icon_uzuri.webp',
    valda:'icon_valda.webp',             verdance:'icon_verdance.webp',
    victor:'icon_victor.webp',           viserai:'icon_viserai.webp',
    vynnset:'icon_vynnset.webp',         yoji:'icon_yoji.webp',
    zen:'icon_zen.webp',                 zyggy:'icon_zyggy-1.webp',
  };

  const showCard = async (user) => {
    const pseudo = user.user_metadata?.pseudo || user.email;

    const { data } = await _sb
      .from('profiles')
      .select('title, favorite_heroes')
      .eq('id', user.id)
      .single();

    const title  = data?.title || '';
    const heroes = Array.isArray(data?.favorite_heroes) ? data.favorite_heroes : [];

    document.getElementById('flash-avatar').textContent = pseudo.charAt(0).toUpperCase();
    document.getElementById('flash-name').textContent   = pseudo;

    const titleEl = document.getElementById('flash-title');
    if (title) {
      titleEl.textContent = title;
      titleEl.classList.remove('hidden');
    } else {
      titleEl.classList.add('hidden');
    }

    document.getElementById('flash-heroes').innerHTML = heroes
      .filter(id => HERO_IMG[id])
      .map(id => `<img src="images/${HERO_IMG[id]}" alt="${id}" loading="lazy" />`)
      .join('');

    document.getElementById('member-flash-card').classList.remove('hidden');
  };

  _sb.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      showCard(session.user);
    } else {
      document.getElementById('member-flash-card')?.classList.add('hidden');
    }
  });
})();
