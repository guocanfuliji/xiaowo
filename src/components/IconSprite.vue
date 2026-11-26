<template>
  <svg class="sprite" aria-hidden="true">
  <!-- 裁剪路径放在 sprite 顶层：写进 <symbol> 里通过 <use> 引用时不会被应用，
       菠萝屋的菱形纹会溢出果身 -->
  <defs>
    <clipPath id="hb-pine"><path d="M27 102C26.4 82 27.6 70 31 61 35 50 46 44 60 44s25 6 29 17c3.4 9 4.6 21 4 41-.8 22-15 41-33 41s-32.2-19-33-41Z"/></clipPath>
    <clipPath id="hb-rock"><path d="M13 141c-2.4-15 1.6-29 9.4-39.4C31 90 43.4 83 57 82.4c13.6-.6 26 5.4 35 15.4 8 8.8 13 22.4 15 43.2Z"/></clipPath>
    <clipPath id="hb-moai"><path d="M26 143V64L20 60V50h8c4-16 16-26 32-26s28 10 32 26h8v10l-6 4v79Z"/></clipPath>
    <clipPath id="hb-shell"><path d="M60 142C40 134 24 114 16 88A10 10 0 0 1 33.6 81A10 10 0 0 1 51.2 76A10 10 0 0 1 68.8 76A10 10 0 0 1 86.4 81A10 10 0 0 1 104 88C96 114 80 134 60 142Z"/></clipPath>
  </defs>
  <!-- ============ 房子：动画原画风（粗墨线 + 平涂固有色 + 单层赛璐璐阴影 + 高光块） ============ -->

  <!-- 菠萝屋 -->
  <symbol id="h-pineapple" viewBox="0 0 120 150">
    <ellipse cx="60" cy="143" rx="34" ry="5.5" fill="#0B5F6B" opacity=".16"/>
    <!-- 果冠：先叶后身，叶根被果身压住 -->
    <g stroke="#1F5A28" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
      <path d="M60 62C55 44 47 30 37 19c-3 16 6 34 18 45z" fill="#3E8E41"/>
      <path d="M60 62C56 42 52 24 50 10c-10 15-9 36 2 54z" fill="#4FA24E"/>
      <path d="M60 62c1-21 5-38 11-50 6 18 2 37-5 52z" fill="#3E8E41"/>
      <path d="M60 62c8-15 19-26 30-32 0 16-12 29-23 37z" fill="#4FA24E"/>
      <path d="M60 62c-8-15-19-26-30-32 0 16 12 29 23 37z" fill="#57AE55"/>
    </g>
    <!-- 果身 -->
    <path d="M27 102C26.4 82 27.6 70 31 61 35 50 46 44 60 44s25 6 29 17c3.4 9 4.6 21 4 41-.8 22-15 41-33 41s-32.2-19-33-41Z"
      fill="#F7C33F" stroke="#7A4A0F" stroke-width="5" stroke-linejoin="round"/>
    <!-- 赛璐璐阴影 + 高光 -->
    <g clip-path="url(#hb-pine)">
      <path d="M71 40h30v108H71c7-20 10-44 10-70 0-14-4-27-10-38z" fill="#E0A32B" opacity=".5"/>
      <ellipse cx="46" cy="72" rx="14" ry="21" fill="#FFDE7A" opacity=".6"/>
    </g>
    <!-- 菱形鳞纹 -->
    <g clip-path="url(#hb-pine)" stroke="#D9942A" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round">
      <path d="M12 54 108 122M12 76 108 144M12 98 108 166M12 120 108 188"/>
      <path d="M108 54 12 122M108 76 12 144M108 98 12 166"/>
    </g>
    <!-- 门 -->
    <path d="M60 92c9.4 0 17 7.6 17 17v34H43v-34c0-9.4 7.6-17 17-17z"
      fill="#4E6FA8" stroke="#7A4A0F" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="60" cy="112" r="7" fill="#CFEEFF" stroke="#7A4A0F" stroke-width="4"/>
    <path d="M56 109.4a6.4 6.4 0 0 1 3.6-1.6" stroke="#FFFFFF" stroke-width="2.6" fill="none" opacity=".9" stroke-linecap="round"/>
    <!-- 侧窗 -->
    <circle cx="38" cy="76" r="7.5" fill="#CFEEFF" stroke="#7A4A0F" stroke-width="4.4"/>
    <circle cx="82" cy="76" r="7.5" fill="#CFEEFF" stroke="#7A4A0F" stroke-width="4.4"/>
  </symbol>

  <!-- 岩石屋（派大星家）：宽扁圆石 + 兔子耳朵天线 -->
  <symbol id="h-rock" viewBox="0 0 120 150">
    <ellipse cx="60" cy="142" rx="42" ry="6" fill="#0B5F6B" opacity=".16"/>
    <path d="M13 141c-2.4-15 1.6-29 9.4-39.4C31 90 43.4 83 57 82.4c13.6-.6 26 5.4 35 15.4 8 8.8 13 22.4 15 43.2Z"
      fill="#B9AC9A" stroke="#6A6052" stroke-width="5" stroke-linejoin="round"/>
    <g clip-path="url(#hb-rock)">
      <path d="M74 78h36v66H74c6-12 9-26 9-40 0-9-3-18-9-26z" fill="#9C8F7D" opacity=".45"/>
      <path d="M21 108c8-14 19-23 32-25" stroke="#DED3BF" stroke-width="9" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M62 128c6-3 12-2 16 2" stroke="#9C8F7D" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".8"/>
    </g>
    <!-- 拱门 -->
    <path d="M46 141v-18c0-7.8 6.4-14 14-14s14 6.2 14 14v18z"
      fill="#6E5F4E" stroke="#4C4136" stroke-width="4.6" stroke-linejoin="round"/>
    <!-- 舷窗 -->
    <circle cx="84" cy="112" r="8.5" fill="#CFEEFF" stroke="#4C4136" stroke-width="4.4"/>
    <circle cx="81.6" cy="109.6" r="2.6" fill="#FFFFFF" opacity=".85"/>
    <!-- 电视天线 -->
    <path d="M57 82V52" stroke="#4C4136" stroke-width="3.8" stroke-linecap="round"/>
    <path d="M45 52h24" stroke="#4C4136" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="45" cy="52" r="2.8" fill="#4C4136"/>
    <circle cx="69" cy="52" r="2.8" fill="#4C4136"/>
  </symbol>

  <!-- 石像屋（章鱼哥家）：复活节岛摩艾头像 -->
  <symbol id="h-moai" viewBox="0 0 120 150">
    <ellipse cx="60" cy="143" rx="32" ry="5.5" fill="#0B5F6B" opacity=".16"/>
    <!-- 头颅：眉脊直接做进轮廓，形成阶梯式外凸，不再是一条浮在脸上的横杠 -->
    <path d="M26 143V64L20 60V50h8c4-16 16-26 32-26s28 10 32 26h8v10l-6 4v79Z"
      fill="#BAB9B0" stroke="#5A5548" stroke-width="5" stroke-linejoin="round"/>
    <g clip-path="url(#hb-moai)">
      <path d="M80 24h20v120H80c4-30 6-57 6-83 0-15-2-27-6-37z" fill="#A2A196" opacity=".45"/>
      <rect x="18" y="48" width="84" height="16" fill="#A5A499"/>
    </g>
    <!-- 眼窝做成舷窗：像石像的眼睛，也说明这是房子 -->
    <ellipse cx="44" cy="80" rx="9.5" ry="7.5" fill="#CFEEFF" stroke="#5A5548" stroke-width="4.4"/>
    <ellipse cx="76" cy="80" rx="9.5" ry="7.5" fill="#CFEEFF" stroke="#5A5548" stroke-width="4.4"/>
    <path d="M39 77a6 6 0 0 1 3.8-2.4M71 77a6 6 0 0 1 3.8-2.4" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>
    <!-- 长鼻：从眉脊一路落到唇上 -->
    <path d="M53 64h14l5.4 33c.6 4.2-2.8 7-6.8 7H54.4c-4 0-7.4-2.8-6.8-7z"
      fill="#AEADA2" stroke="#5A5548" stroke-width="4.4" stroke-linejoin="round"/>
    <!-- 厚唇 -->
    <path d="M40 116c0-3.2 2.6-5.8 5.8-5.8h28.4c3.2 0 5.8 2.6 5.8 5.8s-2.6 5.8-5.8 5.8H45.8c-3.2 0-5.8-2.6-5.8-5.8z"
      fill="#A2A196" stroke="#5A5548" stroke-width="4"/>
    <!-- 木门 -->
    <path d="M60 123c6.4 0 10.6 4.2 10.6 10v10H49.4v-10c0-5.8 4.2-10 10.6-10z"
      fill="#8B5A2B" stroke="#4F3113" stroke-width="4.4" stroke-linejoin="round"/>
    <circle cx="60" cy="134" r="3.6" fill="#CFEEFF" stroke="#4F3113" stroke-width="2.8"/>
  </symbol>

  <!-- 圆顶树屋（珊迪家）：玻璃球 + 橡果顶 + 内部沙地与树 -->
  <symbol id="h-dome" viewBox="0 0 120 150">
    <ellipse cx="60" cy="143" rx="42" ry="5.5" fill="#0B5F6B" opacity=".16"/>
    <!-- 球内：沙地 + 小树 -->
    <path d="M20 121c8-7 22-10.6 40-10.6s32 3.6 40 10.6c-5.4 10.4-21 15.8-40 15.8s-34.6-5.4-40-15.8z" fill="#E9D3A6"/>
    <path d="M60 110V76" stroke="#8A5A2E" stroke-width="7" stroke-linecap="round"/>
    <path d="M60 44c9.6 0 17 6 17 13.6 5.4 1.8 9 6.4 9 12.4 0 8-7.4 14-17.6 14H52.6c-10.2 0-17.6-6-17.6-14 0-6 3.6-10.6 9-12.4C44 50 50.4 44 60 44z"
      fill="#4FA346" stroke="#2E6630" stroke-width="4.6" stroke-linejoin="round"/>
    <path d="M60 48c6 0 11 2.6 14 6.8-4 2.4-8.6 3.4-14 3.4s-10-1-14-3.4C49 50.6 54 48 60 48z" fill="#6FBF5C" opacity=".85"/>
    <!-- 玻璃罩 -->
    <circle cx="60" cy="86" r="47" fill="#E6FAFF" fill-opacity=".26" stroke="#3E6B7A" stroke-width="5"/>
    <path d="M25 76a36 36 0 0 1 12-17" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" opacity=".95"/>
    <!-- 金属底座 -->
    <path d="M26 141h68c3 0 4.6-2.2 3.4-5l-3.8-9.2H26.4l-3.8 9.2c-1.2 2.8.4 5 3.4 5z"
      fill="#AEBCC2" stroke="#3E6B7A" stroke-width="4.6" stroke-linejoin="round"/>
    <path d="M31 132h58" stroke="#7E9099" stroke-width="2.6" opacity=".8"/>
    <!-- 气闸门 -->
    <path d="M60 100c7.2 0 13 5.4 13 12.6V128H47v-15.4c0-7.2 5.8-12.6 13-12.6z"
      fill="#B9C6CC" stroke="#3E6B7A" stroke-width="4.6" stroke-linejoin="round"/>
    <circle cx="60" cy="113" r="4.6" fill="#EAF9FF" stroke="#3E6B7A" stroke-width="3"/>
    <!-- 橡果顶 -->
    <path d="M60 14c12 0 21 6 21 14 0 8-6 12-13 12H52c-7 0-13-4-13-12 0-8 9-14 21-14z"
      fill="#B0703C" stroke="#5E3A16" stroke-width="4.6" stroke-linejoin="round"/>
    <path d="M60 14V5" stroke="#5E3A16" stroke-width="6" stroke-linecap="round"/>
  </symbol>

  <!-- 贝壳屋：扇形扇贝，波浪形冠边 + 放射肋 + 边缘环带 -->
  <symbol id="h-shell" viewBox="0 0 120 150">
    <ellipse cx="60" cy="143" rx="38" ry="5.5" fill="#0B5F6B" opacity=".16"/>
    <path d="M60 142C40 134 24 114 16 88A10 10 0 0 1 33.6 81A10 10 0 0 1 51.2 76A10 10 0 0 1 68.8 76A10 10 0 0 1 86.4 81A10 10 0 0 1 104 88C96 114 80 134 60 142Z"
      fill="#FFD6DE" stroke="#A8546E" stroke-width="5" stroke-linejoin="round"/>
    <g clip-path="url(#hb-shell)">
      <path d="M63 148C47 138 33 120 27 96c12-9 26-12 40-11 10 1 19 4 26 9-3 23-16 42-30 54z"
        fill="#FFC2CF" opacity=".65"/>
    </g>
    <!-- 边缘环带：整体缩小一圈的同形轮廓 -->
    <g transform="translate(60 142) scale(.88) translate(-60 -142)">
      <path d="M60 142C40 134 24 114 16 88A10 10 0 0 1 33.6 81A10 10 0 0 1 51.2 76A10 10 0 0 1 68.8 76A10 10 0 0 1 86.4 81A10 10 0 0 1 104 88C96 114 80 134 60 142Z"
        fill="none" stroke="#E8A6B4" stroke-width="3.4" stroke-linejoin="round"/>
    </g>
    <!-- 放射肋：由铰合部射向每个波峰 -->
    <g stroke="#D2829A" stroke-width="3.4" fill="none" stroke-linecap="round">
      <path d="M60 130 25 80M60 130 42 73M60 130 60 70M60 130 78 73M60 130 95 80"/>
    </g>
    <!-- 门 -->
    <path d="M60 110c8 0 13.6 5.4 13.6 12.6V142H46.4v-19.4c0-7.2 5.6-12.6 13.6-12.6z"
      fill="#4E6FA8" stroke="#8A4A5C" stroke-width="4.6" stroke-linejoin="round"/>
    <circle cx="60" cy="126" r="5" fill="#CFEEFF" stroke="#8A4A5C" stroke-width="3"/>
  </symbol>

  <!-- 船锚屋（蟹老板家） -->
  <symbol id="h-anchor" viewBox="0 0 120 150">
    <ellipse cx="60" cy="142" rx="34" ry="5.5" fill="#0B5F6B" opacity=".16"/>
    <g stroke="#2E3841" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
      <circle cx="60" cy="30" r="10" fill="none" stroke-width="7"/>
      <path d="M28 54h64" stroke-width="10"/>
      <path d="M60 40v92" stroke-width="12"/>
      <path d="M20 100c0 24 18 40 40 40s40-16 40-40" fill="none" stroke-width="11"/>
      <path d="M20 100l-10-8 1 18zM100 100l10-8-1 18z" stroke-width="4"/>
    </g>
    <!-- 金属高光 -->
    <g stroke="#98A6B2" stroke-width="3.4" stroke-linecap="round" fill="none" opacity=".7">
      <path d="M55 46v74"/>
      <path d="M32 51h16"/>
      <path d="M30 108c6 12 16 20 28 22"/>
    </g>
    <circle cx="60" cy="76" r="8.5" fill="#CFEEFF" stroke="#2E3841" stroke-width="4"/>
    <path d="M60 104c7 0 12 4.6 12 10.8V142H48v-27.2c0-6.2 5-10.8 12-10.8z"
      fill="#8B5A2B" stroke="#4F3113" stroke-width="4.4" stroke-linejoin="round"/>
  </symbol>

  <!-- 角色大头照 -->
  <symbol id="ch-spongebob" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="sb-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDEB6E"/><stop offset="1" stop-color="#F1C216"/></linearGradient>
    </defs>
    <g stroke="#5C3F04" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
      <path d="M12 23c0-7 5-12 12-12 2-5 7-6 11-3 4-5 11-4 13 1 5-2 10 2 10 7 7 2 10 6 10 13v49a9 9 0 0 1-9 9H21a9 9 0 0 1-9-9z" fill="url(#sb-skin)"/>
    </g>
    <g fill="#DFB312" opacity=".45">
      <ellipse cx="21" cy="34" rx="6.4" ry="4.6"/><ellipse cx="80" cy="38" rx="5.6" ry="4"/>
      <ellipse cx="27" cy="79" rx="5" ry="3.6"/><ellipse cx="74" cy="77" rx="6" ry="4.2"/>
      <ellipse cx="51" cy="20" rx="4.4" ry="3.2"/>
    </g>
    <ellipse cx="35.5" cy="43" rx="13.6" ry="15" fill="#fff" stroke="#2B2A27" stroke-width="3.4"/>
    <ellipse cx="64.5" cy="43" rx="13.6" ry="15" fill="#fff" stroke="#2B2A27" stroke-width="3.4"/>
    <circle cx="37.6" cy="45" r="7.8" fill="#4FC1F0" stroke="#2B2A27" stroke-width="2.2"/>
    <circle cx="66.4" cy="45" r="7.8" fill="#4FC1F0" stroke="#2B2A27" stroke-width="2.2"/>
    <circle cx="37.6" cy="45" r="3.9" fill="#1F1C19"/>
    <circle cx="66.4" cy="45" r="3.9" fill="#1F1C19"/>
    <circle cx="34.8" cy="41.6" r="2.3" fill="#fff"/><circle cx="63.6" cy="41.6" r="2.3" fill="#fff"/>
    <g stroke="#2B2A27" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M21.4 29.6c3.4-5.6 10.4-7.4 16.2-4.4M78.6 29.6c-3.4-5.6-10.4-7.4-16.2-4.4"/>
      <path d="M23.6 28.4l-3-2.2M27.4 26.2l-2.2-3M31.6 25.6l-1.2-3.6M76.4 28.4l3-2.2M72.6 26.2l2.2-3M68.4 25.6l1.2-3.6"/>
    </g>
    <path d="M50 51c4.2 0 6.4 4.2 5.2 8.6-1 3.4-4 4.6-5.2 4.6s-4.2-1.2-5.2-4.6C43.6 55.2 45.8 51 50 51z" fill="#F1C216" stroke="#5C3F04" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M32.4 68c3.2 9.4 10 15.4 17.6 15.4s14.4-6 17.6-15.4z" fill="#7C2B18" stroke="#2B2A27" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M37.6 74.6c4 5 8.2 7.6 12.4 7.6s8.4-2.6 12.4-7.6" fill="none" stroke="#B95C3E" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
    <path d="M45.2 70.6h4.5v8.8h-4.5zM54.3 70.6h4.5v8.8h-4.5z" fill="#fff" stroke="#2B2A27" stroke-width="2.1" stroke-linejoin="round"/>
    <g fill="#D2931A"><circle cx="24" cy="57" r="2.4"/><circle cx="76" cy="57" r="2.4"/><circle cx="32" cy="70" r="2"/><circle cx="68" cy="70" r="2"/></g>
  </symbol>

  <symbol id="ch-patrick" viewBox="0 0 100 100">
    <defs><linearGradient id="pt-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC3D0"/><stop offset="1" stop-color="#FF9CB5"/></linearGradient></defs>
    <path d="M50 5 62.4 39.2l36.2.9-28.4 21.8 11.2 34.6L50 76.2 18.6 96.5 29.8 61.9 1.4 40.1l36.2-.9z" fill="url(#pt-skin)" stroke="#BE5B7B" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="50" cy="71" rx="23" ry="17" fill="#FFDCE5" opacity=".9"/>
    <circle cx="50" cy="71" r="3.2" fill="#C9738F" opacity=".65"/>
    <ellipse cx="39" cy="45.5" rx="10.6" ry="11" fill="#fff" stroke="#2B2A27" stroke-width="3"/>
    <ellipse cx="61" cy="45.5" rx="10.6" ry="11" fill="#fff" stroke="#2B2A27" stroke-width="3"/>
    <path d="M28.4 40.6a10.6 11 0 0 1 21.2 0z" fill="#D989B8" stroke="#2B2A27" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M50.4 40.6a10.6 11 0 0 1 21.2 0z" fill="#D989B8" stroke="#2B2A27" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="40.4" cy="49" r="4" fill="#241F1C"/><circle cx="60.6" cy="49" r="4" fill="#241F1C"/>
    <circle cx="37.4" cy="45.6" r="1.9" fill="#fff"/><circle cx="57.6" cy="45.6" r="1.9" fill="#fff"/>
    <path d="M32.4 34.4c2.6-3.6 7-4.4 10-2.4M67.6 34.4c-2.6-3.6-7-4.4-10-2.4" fill="none" stroke="#2B2A27" stroke-width="3" stroke-linecap="round"/>
    <path d="M38 60c3 9 9.4 12.6 12 12.6S59 69 62 60" fill="none" stroke="#2B2A27" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M41.4 66.6c3.2 3.4 6.6 4.6 8.6 4.6s5.4-1.2 8.6-4.6c.4 4.4-3.6 7.6-8.6 7.6s-9-3.2-8.6-7.6z" fill="#C4627F" opacity=".5"/>
  </symbol>

  <symbol id="ch-squidward" viewBox="0 0 100 100">
    <defs><linearGradient id="sq-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A4E7D8"/><stop offset="1" stop-color="#68C0AE"/></linearGradient></defs>
    <path d="M50 6c24 0 34 18 34 37 0 20-11 29-17 35-3 3-4 8-4 13H37c0-5-1-10-4-13-6-6-17-15-17-35C16 24 26 6 50 6z" fill="url(#sq-skin)" stroke="#2C8371" stroke-width="4" stroke-linejoin="round"/>
    <g fill="#7FCDBC"><circle cx="35" cy="15" r="2.4"/><circle cx="50" cy="12" r="2.4"/><circle cx="65" cy="15" r="2.4"/><circle cx="42" cy="21" r="1.8"/><circle cx="58" cy="21" r="1.8"/></g>
    <ellipse cx="36.5" cy="44" rx="12.6" ry="13.6" fill="#FFFFFF" stroke="#2B2A27" stroke-width="3.2"/>
    <ellipse cx="63.5" cy="44" rx="12.6" ry="13.6" fill="#FFFFFF" stroke="#2B2A27" stroke-width="3.2"/>
    <circle cx="38" cy="47.6" r="5.4" fill="#241F1C"/>
    <circle cx="65" cy="47.6" r="5.4" fill="#241F1C"/>
    <circle cx="35.4" cy="43.8" r="2" fill="#fff"/><circle cx="62.4" cy="43.8" r="2" fill="#fff"/>
    <path d="M24.4 40.4a12.6 13.6 0 0 1 24.2 0z" fill="#8FD6C5" stroke="#2B2A27" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M51.4 40.4a12.6 13.6 0 0 1 24.2 0z" fill="#8FD6C5" stroke="#2B2A27" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M32.4 51.6c1.8 2.2 4.6 2.8 6.6 1.6M61.2 51.6c1.8 2.2 4.6 2.8 6.6 1.6" fill="none" stroke="#2B2A27" stroke-width="2" stroke-linecap="round" opacity=".5"/>
    <path d="M50 51c5.6 0 8.4 5.4 9 11.4.8 7.6.2 13.6-9 13.6s-9.8-6-9-13.6c.6-6 3.4-11.4 9-11.4z" fill="url(#sq-skin)" stroke="#2C8371" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M44.6 60.4c-1.6 2.6-2 5-.6 6.8" fill="none" stroke="#57A997" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M38 80c3 4 6 6 12 6s9-2 12-6" fill="none" stroke="#2B2A27" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M43.6 84.6c4-2 8.8-2 12.8 0" fill="#E79A9A" stroke="#2B2A27" stroke-width="2" stroke-linejoin="round"/>
  </symbol>

  <symbol id="ch-sandy" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="sd-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCB079"/><stop offset="1" stop-color="#B57C43"/></linearGradient>
      <radialGradient id="sd-glass" cx=".34" cy=".26" r=".85"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".62"/><stop offset=".48" stop-color="#DAF3FF" stop-opacity=".24"/><stop offset="1" stop-color="#79C8EA" stop-opacity=".46"/></radialGradient>
    </defs>
    <circle cx="50" cy="48" r="42" fill="url(#sd-glass)" stroke="#3E92B8" stroke-width="4.6"/>
    <path d="M31 21a38 38 0 0 1 22-10" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round" opacity=".9"/>
    <circle cx="22" cy="50" r="5.5" fill="#fff" opacity=".4"/>
    <circle cx="31" cy="66" r="11" fill="url(#sd-fur)" stroke="#6F471F" stroke-width="3.4"/>
    <circle cx="69" cy="66" r="11" fill="url(#sd-fur)" stroke="#6F471F" stroke-width="3.4"/>
    <circle cx="50" cy="53" r="27" fill="url(#sd-fur)" stroke="#6F471F" stroke-width="3.8"/>
    <g fill="url(#sd-fur)" stroke="#6F471F" stroke-width="3" stroke-linejoin="round">
      <path d="M38 29c-2-7 .6-11 3.4-13 1.4 4.6 1.4 9.4.4 13.4z"/>
      <path d="M62 29c2-7-.6-11-3.4-13-1.4 4.6-1.4 9.4-.4 13.4z"/>
    </g>
    <ellipse cx="50" cy="66" rx="17.4" ry="13" fill="#FAE6CE" stroke="#6F471F" stroke-width="2.8"/>
    <ellipse cx="38.6" cy="47.6" rx="8.8" ry="10" fill="#fff" stroke="#2B2A27" stroke-width="2.8"/>
    <ellipse cx="61.4" cy="47.6" rx="8.8" ry="10" fill="#fff" stroke="#2B2A27" stroke-width="2.8"/>
    <circle cx="39.6" cy="49.2" r="4.4" fill="#241F1C"/><circle cx="62.4" cy="49.2" r="4.4" fill="#241F1C"/>
    <circle cx="36.8" cy="45.6" r="2" fill="#fff"/><circle cx="59.6" cy="45.6" r="2" fill="#fff"/>
    <g stroke="#2B2A27" stroke-width="2.4" fill="none" stroke-linecap="round">
      <path d="M29.8 38.2c2.4-3.6 6.4-4.4 9.2-2.4M70.2 38.2c-2.4-3.6-6.4-4.4-9.2-2.4"/>
    </g>
    <ellipse cx="50" cy="58.6" rx="5.4" ry="4" fill="#2B2A27"/>
    <ellipse cx="48.2" cy="57.2" rx="1.5" ry="1" fill="#fff" opacity=".5"/>
    <path d="M43 65.6c3.8 4.4 10.2 4.4 14 0" fill="none" stroke="#2B2A27" stroke-width="3" stroke-linecap="round"/>
    <path d="M45.4 68.4h4.2v7.4h-4.2zM53.4 68.4h4.2v7.4h-4.2z" fill="#fff" stroke="#2B2A27" stroke-width="2" stroke-linejoin="round"/>
    <g fill="#F093A6" opacity=".42"><ellipse cx="30.4" cy="59" rx="6" ry="4"/><ellipse cx="69.6" cy="59" rx="6" ry="4"/></g>
    <rect x="33" y="87" width="34" height="9" rx="4.5" fill="#B6DEEE" stroke="#3E92B8" stroke-width="3"/>
    <path d="M17 78c-5 0-8 4-8 8s3 6 7 6" fill="none" stroke="#3E92B8" stroke-width="4.4" stroke-linecap="round" opacity=".85"/>
  </symbol>

  <symbol id="ch-krabs" viewBox="0 0 100 100">
    <defs><linearGradient id="kr-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4594C"/><stop offset="1" stop-color="#D22C1F"/></linearGradient></defs>
    <ellipse cx="50" cy="67" rx="35" ry="29" fill="url(#kr-skin)" stroke="#7E1A12" stroke-width="4"/>
    <path d="M19 48a31 31 0 0 1 62 0" fill="none" stroke="#FA9A8F" stroke-width="4" stroke-linecap="round" opacity=".65"/>
    <g stroke="#7E1A12" stroke-width="6" stroke-linecap="round" fill="none">
      <path d="M38 49V33M62 49V33"/>
    </g>
    <ellipse cx="38" cy="25" rx="10.6" ry="10.6" fill="#fff" stroke="#2B2A27" stroke-width="3"/>
    <ellipse cx="62" cy="25" rx="10.6" ry="10.6" fill="#fff" stroke="#2B2A27" stroke-width="3"/>
    <circle cx="39" cy="26" r="4.4" fill="#221F1C"/><circle cx="63" cy="26" r="4.4" fill="#221F1C"/>
    <circle cx="36" cy="22.4" r="1.9" fill="#fff"/><circle cx="60" cy="22.4" r="1.9" fill="#fff"/>
    <g stroke="#7E1A12" stroke-width="3.4" fill="none" stroke-linecap="round">
      <path d="M28 11.6c3.4-3.4 8.4-4 12.4-1.8M72 11.6c-3.4-3.4-8.4-4-12.4-1.8"/>
      <path d="M25 46c3-3 7-3.6 10-2M75 46c-3-3-7-3.6-10-2"/>
    </g>
    <path d="M50 51c5.6-2.6 11 .6 10 6.2-1 4.6-5.6 5.6-10 3.8-4.4-1.8-5.4-5.6-4.4-9.6z" fill="url(#kr-skin)" stroke="#7E1A12" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="46.6" cy="58.6" r="1.5" fill="#7E1A12"/>
    <path d="M30 68c6 13.6 16 19.6 20 19.6s14-6 20-19.6c2 8-6 21.6-20 21.6s-22-13.6-20-21.6z" fill="#7E1A12" stroke="#5C1109" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 68c6 9.6 12 13.6 20 13.6s14-4 20-13.6" fill="none" stroke="#5C1109" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M33 68c5 3 12 4.6 17 4.6s12-1.6 17-4.6" fill="none" stroke="#F4594C" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>
    <g fill="#FA9A8F" opacity=".45"><circle cx="25" cy="78" r="3.8"/><circle cx="75" cy="78" r="3.8"/></g>
    <path d="M13 63c-4-2-7 1-6 5s5 5 7 3" fill="none" stroke="#7E1A12" stroke-width="4" stroke-linecap="round"/>
    <path d="M87 63c4-2 7 1 6 5s-5 5-7 3" fill="none" stroke="#7E1A12" stroke-width="4" stroke-linecap="round"/>
  </symbol>

  <symbol id="ch-gary" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="gy-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ADDCF8"/><stop offset="1" stop-color="#6FA6DC"/></linearGradient>
      <radialGradient id="gy-shell" cx=".36" cy=".28" r=".82"><stop offset="0" stop-color="#EBB0F4"/><stop offset=".6" stop-color="#C46FD6"/><stop offset="1" stop-color="#9C43B2"/></radialGradient>
    </defs>
    <ellipse cx="52" cy="91" rx="42" ry="6" fill="#0b5fa5" opacity=".09"/>
    <path d="M8 93c-1-18 8-30 22-30h12c6 0 9 4 9 10-6 2-10 8-10 15 0 2 0 3-.4 5z" fill="url(#gy-body)" stroke="#3C6FB0" stroke-width="3.8" stroke-linejoin="round"/>
    <path d="M12 89c-7 1-11 5-12 10 7 2 13 1 16-4" fill="none" stroke="#3C6FB0" stroke-width="3.4" stroke-linecap="round"/>
    <g stroke="#3C6FB0" stroke-width="6.4" stroke-linecap="round" fill="none">
      <path d="M22 64V42M38 62V37"/>
    </g>
    <ellipse cx="22" cy="32" rx="10.4" ry="10.4" fill="#fff" stroke="#2B2A27" stroke-width="3"/>
    <ellipse cx="41" cy="28" rx="10.4" ry="10.4" fill="#fff" stroke="#2B2A27" stroke-width="3"/>
    <circle cx="23" cy="33" r="4.3" fill="#241F1C"/><circle cx="42" cy="29" r="4.3" fill="#241F1C"/>
    <circle cx="19.6" cy="29.2" r="1.9" fill="#fff"/><circle cx="38.6" cy="25.2" r="1.9" fill="#fff"/>
    <g stroke="#3C6FB0" stroke-width="3.4" fill="none" stroke-linecap="round">
      <path d="M14 69l-8-5M16 76l-9-2"/>
    </g>
    <path d="M16 80c4.6 4.6 12 5.2 17.4 1.8" fill="none" stroke="#2B2A27" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="63" cy="55" r="31" fill="url(#gy-shell)" stroke="#6C2A80" stroke-width="4"/>
    <circle cx="63" cy="55" r="22" fill="none" stroke="#8E3AA6" stroke-width="2.6" opacity=".5"/>
    <circle cx="63" cy="55" r="12.5" fill="none" stroke="#8E3AA6" stroke-width="2.4" opacity=".5"/>
    <path d="M63 34a21 21 0 1 0 21 21" fill="none" stroke="#FFA9D8" stroke-width="6" stroke-linecap="round" opacity=".95"/>
    <path d="M63 47a8 8 0 1 1-8 8" fill="none" stroke="#FFC7E4" stroke-width="5" stroke-linecap="round"/>
    <path d="M40 34a31 31 0 0 1 15-7" fill="none" stroke="#F3CBF7" stroke-width="5.5" stroke-linecap="round" opacity=".7"/>
    <path d="M84 76c4 1 5 4 3 6" fill="none" stroke="#6C2A80" stroke-width="3.2" stroke-linecap="round"/>
  </symbol>

  <symbol id="ch-plankton" viewBox="0 0 100 100">
    <defs><linearGradient id="pk-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8AD65F"/><stop offset="1" stop-color="#4FA32E"/></linearGradient></defs>
    <g stroke="#2F6B22" stroke-width="5" fill="none" stroke-linecap="round">
      <path d="M38 34 30 18M62 34 70 18"/>
    </g>
    <circle cx="29" cy="15" r="6" fill="#FFD447" stroke="#2F6B22" stroke-width="3"/>
    <circle cx="71" cy="15" r="6" fill="#FFD447" stroke="#2F6B22" stroke-width="3"/>
    <path d="M50 36c20 0 30 14 30 30s-12 28-30 28-30-12-30-28 10-30 30-30z" fill="url(#pk-skin)" stroke="#2F6B22" stroke-width="4"/>
    <circle cx="50" cy="52" r="22" fill="#fff" stroke="#2B2A27" stroke-width="3.6"/>
    <circle cx="51" cy="53" r="8.5" fill="#E8F7A8" stroke="#2B2A27" stroke-width="2.4"/>
    <circle cx="51" cy="53" r="4.6" fill="#221F1C"/>
    <circle cx="46" cy="47" r="3" fill="#fff"/><circle cx="57" cy="59" r="1.8" fill="#fff" opacity=".8"/>
    <g stroke="#2B2A27" stroke-width="4" fill="none" stroke-linecap="round">
      <path d="M24 26c6-6 15-8 21-4M76 26c-6-6-15-8-21-4"/>
    </g>
    <path d="M32 76c6 10 14 14 18 14s12-4 18-14c2 7-6 14-18 14s-20-7-18-14z" fill="#2F6B22" stroke="#1E4A16" stroke-width="3" stroke-linejoin="round"/>
    <path d="M32 76c6 7 12 10 18 10s12-3 18-10" fill="none" stroke="#1E4A16" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M44 80h4v7h-4zM52 80h4v7h-4z" fill="#fff" stroke="#1E4A16" stroke-width="1.8" stroke-linejoin="round"/>
    <g stroke="#2F6B22" stroke-width="4.5" fill="none" stroke-linecap="round">
      <path d="M20 68c-6 2-9 6-8 10M80 68c6 2 9 6 8 10"/>
    </g>
  </symbol>

  <!-- 图标 24 -->
  <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <symbol id="ic-home" viewBox="0 0 24 24"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-6h4v6"/></symbol>
    <symbol id="ic-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/></symbol>
    <symbol id="ic-map" viewBox="0 0 24 24"><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/></symbol>
    <symbol id="ic-heart" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.4a4.5 4.5 0 0 1 7.5 3.1c0 5.4-7.5 10-7.5 10z"/></symbol>
    <symbol id="ic-key" viewBox="0 0 24 24"><circle cx="8" cy="8" r="4"/><path d="m11 11 8 8M15.5 15.5l2 2M18 13l2 2"/></symbol>
    <symbol id="ic-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
    <symbol id="ic-brush" viewBox="0 0 24 24"><path d="M15 4 20 9 11 18H6v-5z"/><path d="m13 6 5 5"/><path d="M6 18c-1.5 1.5-3 1.5-3 1.5S3.5 18 5 16.5"/></symbol>
    <symbol id="ic-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M8 14h2M14 14h2"/></symbol>
    <symbol id="ic-doc" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></symbol>
    <symbol id="ic-wallet" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.4"/></symbol>
    <symbol id="ic-star" viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/></symbol>
    <symbol id="ic-bell" viewBox="0 0 24 24"><path d="M18 16V10a6 6 0 1 0-12 0v6l-2 2.5h16z"/><path d="M10 21h4"/></symbol>
    <symbol id="ic-users" viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.5"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M17 14.5c2.5 0 4.5 1.8 4.5 4.5"/></symbol>
    <symbol id="ic-chart" viewBox="0 0 24 24"><path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3.5" height="5" rx="1"/><rect x="13" y="8" width="3.5" height="9" rx="1"/></symbol>
    <symbol id="ic-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></symbol>
    <symbol id="ic-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.4 2.5c-.6.2-.9.8-.9 1.5"/><circle cx="12" cy="17" r=".8" fill="currentColor"/></symbol>
    <symbol id="ic-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
    <symbol id="ic-chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></symbol>
    <symbol id="ic-arrow-left" viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></symbol>
    <symbol id="ic-pin" viewBox="0 0 24 24"><path d="M12 21s6.5-6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.5"/></symbol>
    <symbol id="ic-bed" viewBox="0 0 24 24"><path d="M3 18v-7h18v7M3 18h18"/><path d="M6 11V8h5v3M13 11V8h5v3"/></symbol>
    <symbol id="ic-area" viewBox="0 0 24 24"><path d="M4 9V4h5M20 15v5h-5"/><path d="M20 9V4h-5M4 15v5h5"/></symbol>
    <symbol id="ic-filter" viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4"/></symbol>
    <symbol id="ic-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></symbol>
    <symbol id="ic-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>
    <symbol id="ic-play" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></symbol>
    <symbol id="ic-send" viewBox="0 0 24 24"><path d="M21 3 3 10.5l7 2.5 2.5 7z"/></symbol>
    <symbol id="ic-camera" viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></symbol>
    <symbol id="ic-more" viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/></symbol>


  <!-- 侧栏彩色图标 -->
  <defs>
    <linearGradient id="gx-yellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE987"/><stop offset="1" stop-color="#F2B40E"/></linearGradient>
    <linearGradient id="gx-coral"  x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9E74"/><stop offset="1" stop-color="#EF5B36"/></linearGradient>
    <linearGradient id="gx-blue"   x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD8FF"/><stop offset="1" stop-color="#2F9BE0"/></linearGradient>
    <linearGradient id="gx-teal"   x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#79E3DC"/><stop offset="1" stop-color="#1FA9A0"/></linearGradient>
    <linearGradient id="gx-green"  x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A6E37B"/><stop offset="1" stop-color="#57A93A"/></linearGradient>
    <linearGradient id="gx-pink"   x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFA9C6"/><stop offset="1" stop-color="#EE5787"/></linearGradient>
    <linearGradient id="gx-purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C6AEFF"/><stop offset="1" stop-color="#8254E8"/></linearGradient>
    <linearGradient id="gx-orange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC766"/><stop offset="1" stop-color="#F08A17"/></linearGradient>
    <linearGradient id="gx-slate"  x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFDCE6"/><stop offset="1" stop-color="#8CA3B5"/></linearGradient>
  </defs>

  <g stroke-linejoin="round" stroke-linecap="round">
    <!-- 首页 -->
    <symbol id="icx-home" viewBox="0 0 24 24">
      <path d="M12 3.4 2.6 11.4h2.1V20a.9.9 0 0 0 .9.9h4.2v-5.4h4.4v5.4h4.2a.9.9 0 0 0 .9-.9v-8.6h2.1z" fill="#FFF6DF" stroke="#8C5C10" stroke-width="1.6"/>
      <path d="M12 2.6 21.3 10.3 12 6.6 2.7 10.3z" fill="url(#gx-coral)" stroke="#8C5C10" stroke-width="1.6"/>
      <path d="M10.9 13.6a1.7 1.7 0 0 1 1.7-1.7" fill="none" stroke="#8C5C10" stroke-width="1.5"/>
      <path d="M10.2 13.6h3.6v2.9h-3.6z" fill="url(#gx-blue)" stroke="#8C5C10" stroke-width="1.4"/>
    </symbol>

    <!-- 地图 -->
    <symbol id="icx-map" viewBox="0 0 24 24">
      <path d="M9.1 3.2 3.4 5.6v15.2l5.7-2.4 5.8 2.4 5.9-2.4V3.2l-5.9 2.4z" fill="#DFF3E4" stroke="#3E7A55" stroke-width="1.6"/>
      <path d="M9.1 3.2v15.2M14.9 5.6v15.2" fill="none" stroke="#3E7A55" stroke-width="1.5"/>
      <path d="M14.9 5.6 20.8 3.2V.6" fill="none" stroke="#3E7A55" stroke-width="1.4"/>
      <path d="M15.6 12.4c0 2.3-1.9 4.1-3.5 4.1s-3.5-1.8-3.5-4.1 1.6-6.6 3.5-6.6 3.5 4.3 3.5 6.6z" fill="url(#gx-pink)" stroke="#A6365C" stroke-width="1.5"/>
      <circle cx="12.1" cy="12" r="1.35" fill="#FFF" stroke="#A6365C" stroke-width="1.2"/>
    </symbol>

    <!-- 收藏 -->
    <symbol id="icx-heart" viewBox="0 0 24 24">
      <path d="M12 20.8s-8-4.8-8-10.6A4.9 4.9 0 0 1 12 6.9a4.9 4.9 0 0 1 8 3.3c0 5.8-8 10.6-8 10.6z" fill="url(#gx-pink)" stroke="#A6365C" stroke-width="1.6"/>
      <path d="M8.6 9.4c-.7-.6-.5-1.6.5-1.9" fill="none" stroke="#FFE6EE" stroke-width="1.7" opacity=".95"/>
    </symbol>

    <!-- 我的房源（钥匙） -->
    <symbol id="icx-key" viewBox="0 0 24 24">
      <circle cx="8.2" cy="9.2" r="4.7" fill="none" stroke="#8C5C10" stroke-width="2.6"/>
      <circle cx="8.2" cy="9.2" r="4.7" fill="url(#gx-yellow)" stroke="#8C5C10" stroke-width="1.4"/>
      <circle cx="8.2" cy="9.2" r="1.5" fill="#8C5C10"/>
      <path d="m11.5 12.6 8.6 8.6" stroke="#B98A12" stroke-width="3.1"/>
      <path d="m11.5 12.6 8.6 8.6" stroke="url(#gx-yellow)" stroke-width="1.7"/>
      <path d="m16.3 15.6 2.4 2.4M18.7 13.2l2.4 2.4" stroke="#B98A12" stroke-width="2.2"/>
    </symbol>

    <!-- 发布（加号） -->
    <symbol id="icx-plus" viewBox="0 0 24 24">
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="6.4" fill="url(#gx-green)" stroke="#2F6B22" stroke-width="1.7"/>
      <path d="M12 7.4v9.2M7.4 12h9.2" stroke="#FFF" stroke-width="2.6"/>
      <path d="M6.4 7.2c1-1.4 2.9-2.2 4.4-2" fill="none" stroke="#E9FFDE" stroke-width="1.5" opacity=".8"/>
    </symbol>

    <!-- 装修（刷子） -->
    <symbol id="icx-brush" viewBox="0 0 24 24">
      <path d="M15.2 3.4 20.6 8.8 11.5 18h-5.4v-5.4z" fill="url(#gx-purple)" stroke="#4B2C93" stroke-width="1.6"/>
      <path d="m13.2 6 5.4 5.4" fill="none" stroke="#EDE4FF" stroke-width="1.6" opacity=".9"/>
      <path d="M6.1 18c-1.9 1.9-3.8 2.2-3.8 2.2s.3-1.9 2.2-3.8z" fill="url(#gx-pink)" stroke="#A6365C" stroke-width="1.5"/>
    </symbol>

    <!-- 预约（日历） -->
    <symbol id="icx-calendar" viewBox="0 0 24 24">
      <rect x="3.2" y="4.8" width="17.6" height="16" rx="3.2" fill="#FFFDF6" stroke="#2F6B9E" stroke-width="1.6"/>
      <rect x="3.2" y="4.8" width="17.6" height="5" rx="3.2" fill="url(#gx-blue)" stroke="#2F6B9E" stroke-width="1.5"/>
      <path d="M8 2.6v4.2M16 2.6v4.2" stroke="#2F6B9E" stroke-width="1.8"/>
      <path d="M3.2 10h17.6" stroke="#2F6B9E" stroke-width="1.3"/>
      <rect x="7" y="12.4" width="3.6" height="3.4" rx="1" fill="url(#gx-coral)" stroke="#A63621" stroke-width="1.2"/>
      <path d="M13 14.2h4" stroke="#9FB6C6" stroke-width="1.7"/>
      <path d="M7 18.4h4M13 18.4h4" stroke="#B9CBD8" stroke-width="1.6"/>
    </symbol>

    <!-- 租约（文档） -->
    <symbol id="icx-doc" viewBox="0 0 24 24">
      <path d="M6 2.8h8l4.2 4.2v14.2H6z" fill="#FFFCF2" stroke="#3E7A55" stroke-width="1.6"/>
      <path d="M14 2.8v4.2h4.2z" fill="url(#gx-teal)" stroke="#3E7A55" stroke-width="1.4"/>
      <rect x="8.4" y="12" width="7.2" height="1.9" rx=".9" fill="url(#gx-teal)"/>
      <rect x="8.4" y="15.8" width="5" height="1.9" rx=".9" fill="#BFD9CF"/>
      <circle cx="15.2" cy="16.8" r="1.9" fill="url(#gx-pink)" stroke="#A6365C" stroke-width="1.2"/>
      <path d="m14.2 16.8 1.2 1.2 1.7-2" fill="none" stroke="#FFF" stroke-width="1.2"/>
    </symbol>

    <!-- 账单（钱包） -->
    <symbol id="icx-wallet" viewBox="0 0 24 24">
      <rect x="2.8" y="6.2" width="18.4" height="13.4" rx="3.4" fill="url(#gx-blue)" stroke="#1E5F8F" stroke-width="1.6"/>
      <path d="M2.8 10.2h18.4" stroke="#1E5F8F" stroke-width="1.4"/>
      <path d="M2.8 9.2c3.4-2.4 7-2.4 10.4 0 3.4 2.4 7 2.4 10.4 0v2.6c-3.4 2.4-7 2.4-10.4 0-3.4-2.4-7-2.4-10.4 0z" fill="url(#gx-orange)" stroke="#A6590F" stroke-width="1.4"/>
      <circle cx="17" cy="14.6" r="1.7" fill="url(#gx-yellow)" stroke="#8C5C10" stroke-width="1.2"/>
    </symbol>

    <!-- 评价（星星） -->
    <symbol id="icx-star" viewBox="0 0 24 24">
      <path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z" fill="url(#gx-yellow)" stroke="#9A6B08" stroke-width="1.6"/>
      <path d="M9.9 8.6c1.4-.6 2.9-.3 3.6.7" fill="none" stroke="#FFF6D6" stroke-width="1.6" opacity=".85"/>
    </symbol>

    <!-- 消息（铃铛） -->
    <symbol id="icx-bell" viewBox="0 0 24 24">
      <path d="M18.2 15.6V10a6.2 6.2 0 0 0-12.4 0v5.6l-2 2.6h16.4z" fill="url(#gx-orange)" stroke="#8F4A08" stroke-width="1.6"/>
      <path d="M10.4 20.4h3.2" stroke="#8F4A08" stroke-width="2.2"/>
      <path d="M15.4 20.4a1.6 1.6 0 0 1-3.2 0" fill="url(#gx-yellow)" stroke="#8F4A08" stroke-width="1.4"/>
      <path d="M8.6 9.4c.8-3 3.4-4.6 6.4-4.4" fill="none" stroke="#FFE9C6" stroke-width="1.5" opacity=".85"/>
      <circle cx="18.4" cy="6.4" r="2.5" fill="#FF4D5E" stroke="#FFF" stroke-width="1.4"/>
    </symbol>

    <!-- 买房 / 出售挂牌 -->
    <symbol id="icx-tag" viewBox="0 0 24 24">
      <path d="M12.3 3.1 20.9 11.7a1.9 1.9 0 0 1 0 2.7l-6.5 6.5a1.9 1.9 0 0 1-2.7 0L3.1 12.3V4.6a1.5 1.5 0 0 1 1.5-1.5h7.7z" fill="url(#gx-orange)" stroke="#8A4A0B" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="7.9" cy="8" r="1.8" fill="#FFF"/>
    </symbol>

    <!-- 法拍房 -->
    <symbol id="icx-gavel" viewBox="0 0 24 24">
      <g transform="rotate(-42 13 7)">
        <rect x="8.6" y="4.1" width="8.8" height="5.8" rx="1.7" fill="url(#gx-yellow)" stroke="#8A4A0B" stroke-width="1.4"/>
      </g>
      <path d="M11.4 9.3 6.4 16.2" fill="none" stroke="#8A4A0B" stroke-width="2.1" stroke-linecap="round"/>
      <rect x="3.1" y="16.4" width="5.6" height="2.7" rx="1.1" fill="url(#gx-green)" stroke="#2F6B24" stroke-width="1.3"/>
    </symbol>

    <symbol id="icx-deal" viewBox="0 0 24 24">
      <path d="M3.6 8.6h13.2l-3.1-3.1" fill="none" stroke="#C2410C" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20.4 15.4H7.2l3.1 3.1" fill="none" stroke="#C2410C" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="19.6" cy="8.6" r="2.2" fill="url(#gx-yellow)" stroke="#8A4A0B" stroke-width="1.3"/>
      <circle cx="4.4" cy="15.4" r="2.2" fill="url(#gx-green)" stroke="#2F6B24" stroke-width="1.3"/>
    </symbol>

    <!-- 邻里社区 -->
    <symbol id="icx-chat" viewBox="0 0 24 24">
      <path d="M4.6 5.4h14.8a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H10.8l-3.9 3.1v-3.1H4.6a2 2 0 0 1-2-2V7.4a2 2 0 0 1 2-2z" fill="url(#gx-teal)" stroke="#0B5F5B" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="8.6" cy="11.1" r="1.4" fill="#0B5F5B"/>
      <circle cx="12" cy="11.1" r="1.4" fill="#0B5F5B"/>
      <circle cx="15.4" cy="11.1" r="1.4" fill="#0B5F5B"/>
    </symbol>

    <!-- 邻居 -->
    <symbol id="icx-users" viewBox="0 0 24 24">
      <circle cx="9" cy="8.4" r="4" fill="url(#gx-blue)" stroke="#1E5F8F" stroke-width="1.5"/>
      <path d="M2.8 20.4c0-3.4 2.9-5.7 6.2-5.7s6.2 2.3 6.2 5.7z" fill="url(#gx-blue)" stroke="#1E5F8F" stroke-width="1.5"/>
      <circle cx="17.4" cy="9.4" r="3" fill="url(#gx-pink)" stroke="#A6365C" stroke-width="1.4"/>
      <path d="M16.6 15c2.7.2 4.8 2.2 4.8 5.1" fill="none" stroke="#A6365C" stroke-width="1.8"/>
      <circle cx="7.6" cy="7.8" r=".9" fill="#FFF"/><circle cx="16.6" cy="9" r=".8" fill="#FFF"/>
    </symbol>

    <!-- 数据看板 -->
    <symbol id="icx-chart" viewBox="0 0 24 24">
      <path d="M4 3.4v16.8h16.4" fill="none" stroke="#2F6B9E" stroke-width="1.8"/>
      <rect x="6.6" y="12.2" width="3.6" height="7.6" rx="1.2" fill="url(#gx-teal)" stroke="#14615C" stroke-width="1.3"/>
      <rect x="12" y="7.8" width="3.6" height="12" rx="1.2" fill="url(#gx-blue)" stroke="#1E5F8F" stroke-width="1.3"/>
      <rect x="17.4" y="10" width="3.6" height="9.8" rx="1.2" fill="url(#gx-coral)" stroke="#A63621" stroke-width="1.3"/>
    </symbol>

    <!-- 重播 -->
    <symbol id="icx-play" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.4" fill="url(#gx-teal)" stroke="#14615C" stroke-width="1.7"/>
      <path d="M10.2 7.9v8.2l6.8-4.1z" fill="#FFF" stroke="#14615C" stroke-width="1.4"/>
      <path d="M4.6 8.4A9.4 9.4 0 0 1 7.2 5" fill="none" stroke="#DFFAF6" stroke-width="1.6" opacity=".85"/>
    </symbol>

    <!-- 设置 -->
    <symbol id="icx-settings" viewBox="0 0 24 24">
      <path d="M10.4 2.2h3.2l.5 2.6 2.3.9 2.2-1.4 2.3 2.3-1.4 2.2.9 2.3 2.6.5v3.2l-2.6.5-.9 2.3 1.4 2.2-2.3 2.3-2.2-1.4-2.3.9-.5 2.6h-3.2l-.5-2.6-2.3-.9-2.2 1.4-2.3-2.3 1.4-2.2-.9-2.3-2.6-.5v-3.2l2.6-.5.9-2.3L5.1 5.6 7.4 3.3l2.2 1.4 2.3-.9z" fill="#CBDCE8" stroke="#3E5871" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="4.4" fill="url(#gx-blue)" stroke="#2A4E63" stroke-width="1.6"/>
      <circle cx="12" cy="12" r="1.7" fill="#FFF"/>
    </symbol>

    <!-- 帮助 -->
    <symbol id="icx-help" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.4" fill="url(#gx-purple)" stroke="#4B2C93" stroke-width="1.7"/>
      <path d="M9.4 9.3a2.7 2.7 0 1 1 3.6 2.6c-.7.25-1 .85-1 1.6" fill="none" stroke="#FFF" stroke-width="2"/>
      <circle cx="12.1" cy="17.2" r="1.2" fill="#FFF"/>
      <path d="M5.4 7.6A9.4 9.4 0 0 1 8 5" fill="none" stroke="#EDE4FF" stroke-width="1.6" opacity=".8"/>
    </symbol>

    <!-- 退出/菜单 -->
    <symbol id="icx-menu" viewBox="0 0 24 24">
      <rect x="3" y="4.6" width="18" height="14.8" rx="4.4" fill="url(#gx-teal)" stroke="#14615C" stroke-width="1.6"/>
      <path d="M7 9h10M7 12.4h10M7 15.8h6" stroke="#FFF" stroke-width="1.9"/>
    </symbol>

    <!-- 房源对比 -->
    <symbol id="icx-compare" viewBox="0 0 24 24">
      <rect x="2.5" y="4.2" width="8.6" height="15.6" rx="2.2" fill="#E4F5E8" stroke="#3E7A55" stroke-width="1.6"/>
      <rect x="12.9" y="4.2" width="8.6" height="15.6" rx="2.2" fill="#FFF3D6" stroke="#8C5C10" stroke-width="1.6"/>
      <path d="M5.1 8.6h3.4M5.1 11.8h3.4M5.1 15h2.3" stroke="#3E7A55" stroke-width="1.6"/>
      <path d="M15.5 8.6h3.4M15.5 11.8h3.4M15.5 15h2.3" stroke="#8C5C10" stroke-width="1.6"/>
      <circle cx="8" cy="6.6" r="1.15" fill="url(#gx-green)" stroke="#3E7A55" stroke-width="1"/>
      <circle cx="18.4" cy="6.6" r="1.15" fill="url(#gx-yellow)" stroke="#8C5C10" stroke-width="1"/>
    </symbol>

    <!-- 信用徽章 -->
    <symbol id="icx-shield" viewBox="0 0 24 24">
      <path d="M12 2.5 4.3 5.3v6.9c0 4.6 3.2 7.5 7.7 9.3 4.5-1.8 7.7-4.7 7.7-9.3V5.3z" fill="url(#gx-blue)" stroke="#1C5F8E" stroke-width="1.6"/>
      <path d="m8.2 11.9 2.7 2.7 5.1-5.3" fill="none" stroke="#FFF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
  </g>
  </g>
  </svg>
</template>

<script setup>
// 海绵宝宝主题 SVG 雪碧图：房屋 h-*、角色 ch-*、单色图标 ic-*、侧栏彩色图标 icx-*
</script>
