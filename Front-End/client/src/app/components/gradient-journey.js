import { HamtryElement, listen, required } from '@hamtry/library'
import css from './gradient-journey.css?inline'

const sheet = new CSSStyleSheet()
sheet.replaceSync(css)

const interests = ['Кино', 'Хоол хийх', 'Ном', 'Аялал', 'Фитнес', 'Хөгжим']
const districts = ['Сүхбаатар', 'Хан-Уул', 'Баянзүрх', 'Баянгол']
const people = [
  { name: 'Ану', age: 24, role: 'host', district: 'Хан-Уул', price: '850,000 ₮', match: 96, interests: ['Кино', 'Хоол хийх'], hair: 1, skin: '#f0b18d', shirt: '#ff4d6d', bio: 'Цэвэрхэн, тайван орчинд амьдрах дуртай. Нэг мууртай.' },
  { name: 'Тэмүүлэн', age: 27, role: 'host', district: 'Сүхбаатар', price: '920,000 ₮', match: 91, interests: ['Фитнес', 'Хөгжим'], hair: 2, skin: '#d99570', shirt: '#4361ee', bio: 'Дизайнер. Амралтаар ууланд алхаж, кофе уух дуртай.' },
  { name: 'Номин', age: 23, role: 'seeker', district: 'Баянзүрх', price: '700,000 ₮', match: 88, interests: ['Ном', 'Аялал'], hair: 3, skin: '#f4c3a0', shirt: '#7b2cbf', bio: 'Оюутан, нам гүм, эмх цэгцтэй орчин хайж байна.' },
  { name: 'Билгүүн', age: 26, role: 'seeker', district: 'Баянгол', price: '780,000 ₮', match: 84, interests: ['Хоол хийх', 'Фитнес'], hair: 0, skin: '#c98560', shirt: '#fb8500', bio: 'Программист. Өглөө эрт босдог, хамтдаа хоол хийх дуртай.' },
]

const avatar = (person, className = '') => `<svg class="avatar ${className}" viewBox="0 0 160 180" aria-hidden="true"><circle cx="80" cy="82" r="73" fill="#fff4e2" opacity=".35"/><path d="M24 180c3-37 24-57 56-57s53 20 56 57Z" fill="${person.shirt}"/><path d="M63 116h34v26H63z" fill="${person.skin}"/><ellipse cx="80" cy="78" rx="41" ry="48" fill="${person.skin}"/><path d="${['M37 68c0-29 16-45 43-45s44 16 44 45c-10-8-19-12-31-13-15 12-32 16-56 13Z', 'M35 69c-2-28 13-48 43-48 31 0 47 18 47 49l-13-10-8 9-11-12-10 10-12-11-11 12-15-9Z', 'M36 70c-4-27 13-48 43-48 31 0 46 19 45 47-15-5-29-15-38-28-6 13-22 23-50 29Z', 'M36 72c-4-31 12-51 43-51 30 0 46 20 45 51l-11-8v43H47V65l-11 7Z'][person.hair]}" fill="#202a44"/><circle cx="65" cy="82" r="3.3" fill="#202a44"/><circle cx="96" cy="82" r="3.3" fill="#202a44"/><path d="M70 101c7 6 14 6 21 0" fill="none" stroke="#9c574b" stroke-width="3" stroke-linecap="round"/></svg>`

export class HamtryGradientJourney extends HamtryElement {
  step = 'door'
  role = 'seeker'
  profile = { name: '', district: districts[0], interests: ['Кино', 'Хоол хийх'], hair: 1, skin: '#f0b18d', shirt: '#ff4d6d' }
  favourites = new Set()
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = `<section class="journey" data-step="door">
      <section class="door-step" aria-labelledby="journey-title"><div class="ambient ambient-one"></div><div class="ambient ambient-two"></div><header class="journey-nav"><a class="journey-brand" href="#home" aria-label="Hamtry нүүр"><i></i>hamtry</a><span>Хамт амьдрах хүнээ ол.</span><a href="/explore.html#city/home">3D хот руу</a></header><div class="door-copy"><p>ТАНЫ ДАРААГИЙН ОРОН ЗАЙ</p><h1 id="journey-title">Хаалгаа нээ.<br><em>Хүнээ ол.</em></h1><span>Зүгээр нэг өрөө биш. Таны хэмнэлд тохирох хүн, тухтай орон зай.</span></div><button class="door-button" type="button" aria-label="Өрөөний хаалгыг нээх"><span class="door-frame"><span class="door-panel"><b>24</b><i></i></span><span class="door-glow"></span></span><strong><i></i>Хаалгыг тогшоод орох</strong></button><div class="door-footer"><span>Улаанбаатар · жишээ ертөнц</span><span>Доош биш, дотогш аялна</span></div></section>
      <section class="role-step" aria-hidden="true"><header class="step-header"><button class="journey-brand home-button" type="button"><i></i>hamtry</button><span class="progress"><b>01 / 03</b><i><em></em></i><span>Зорилго</span></span><a href="/explore.html#city/home">3D хот</a></header><div class="role-copy"><p>ЭХЛЭЭД ЗОРИЛГОО СОНГОЁ</p><h2>Өрөө хайж<br><em>байна уу?</em></h2><span>Гэрлээ асаагаарай. Танд тохирох сул өрөө, хамтран амьдрагчийг олъё.</span><button class="next-button role-next" type="button">Энэ зөв <b>→</b></button></div><div class="room-stage"><hamtry-hero-scene minimal></hamtry-hero-scene><button class="role-switch" type="button" aria-pressed="true"><small>ON</small><i><b></b></i><strong>Өрөө хайж байна</strong><span>Солихын тулд дарна уу</span></button></div></section>
      <section class="profile-step" aria-hidden="true"><header class="step-header"><button class="journey-brand home-button" type="button"><i></i>hamtry</button><span class="progress"><b>02 / 03</b><i><em></em></i><span>Таны дүр</span></span><button class="back-button" type="button" aria-label="Буцах">←</button></header><div class="profile-layout"><div class="avatar-stage"><p>ТАНЫ ТОГЛООМЫН ДҮР</p><div class="avatar-orbit"><span>ӨӨРИЙН<br>ХЭМНЭЛ</span><div class="selected-avatar"></div></div><b class="role-ticket"></b></div><form class="profile-form"><p>02 · ДҮРЭЭ БҮТЭЭ</p><h2>Өөрийнхөөрөө <em>бай.</em></h2><label>Таныг хэн гэж дуудах вэ?<input name="name" maxlength="30" placeholder="Нэрээ бичнэ үү"></label><div class="form-row"><fieldset><legend>Үсний хэлбэр</legend><div class="hair-options">${[0, 1, 2, 3].map(item => `<button type="button" data-hair="${item}">0${item + 1}</button>`).join('')}</div></fieldset><fieldset><legend>Өнгө</legend><div class="colour-options">${['#f0b18d', '#d99570', '#c98560'].map(color => `<button type="button" data-skin="${color}" style="--swatch:${color}" aria-label="Арьсны өнгө"></button>`).join('')}${['#ff4d6d', '#4361ee', '#7b2cbf'].map(color => `<button type="button" data-shirt="${color}" style="--swatch:${color}" aria-label="Хувцасны өнгө"></button>`).join('')}</div></fieldset></div><fieldset><legend>Хаана амьдрах вэ?</legend><div class="pill-options district-options">${districts.map(item => `<button type="button" data-district="${item}">${item}</button>`).join('')}</div></fieldset><fieldset><legend>Таны сонирхол <small>3 хүртэл</small></legend><div class="pill-options interest-options">${interests.map(item => `<button type="button" data-interest="${item}">${item}</button>`).join('')}</div></fieldset><button class="next-button wide" type="submit">Надад тохирох хүмүүсийг олох <b>→</b></button></form></div></section>
      <section class="matches-step" aria-hidden="true"><header class="step-header"><button class="journey-brand home-button" type="button"><i></i>hamtry</button><span class="progress"><b>03 / 03</b><i><em></em></i><span>Тохирсон хүмүүс</span></span><button class="back-button match-back" type="button" aria-label="Буцах">←</button></header><div class="matches-heading"><div><p>ТАНЫ ХЭМНЭЛД ОЙР</p><h2><em class="profile-name"></em>-д тохирох<br>хүмүүс олдлоо.</h2></div><div class="mini-profile"><div></div><span><b>Таны дүр</b><small></small></span></div></div><div class="match-toolbar"><span class="match-count"></span><div><button class="active" type="button">Тохирлоор</button><button type="button">Үнээр</button><button type="button">Байршлаар</button></div></div><div class="match-grid"></div><a class="browse-link" href="#roommates">Бүх хамтрагчийг үзэх <b>→</b></a></section>
    </section>`
  }
  setup() {
    const $ = selector => required(selector, this.root)
    const setStep = step => { this.step = step; this.update() }
    const select = (selector, attribute, value) => {
      for (const button of this.root.querySelectorAll(selector)) button.classList.toggle('active', button.dataset[attribute] === value)
    }
    const roleText = () => this.role === 'seeker' ? 'Өрөө хайж байна' : 'Өрөө санал болгож байна'
    const updateAvatar = () => {
      $('.selected-avatar').innerHTML = avatar(this.profile)
      $('.mini-profile > div').innerHTML = avatar(this.profile)
      $('.profile-name').textContent = this.profile.name || 'Танд'
      $('.mini-profile small').textContent = roleText()
    }
    const update = () => {
      $('.journey').dataset.step = this.step
      for (const step of this.root.querySelectorAll('.door-step, .role-step, .profile-step, .matches-step')) step.setAttribute('aria-hidden', String(!step.classList.contains(`${this.step}-step`)))
      const seeker = this.role === 'seeker'
      $('.role-step').classList.toggle('lights-off', !seeker)
      $('.role-copy h2').innerHTML = seeker ? 'Өрөө хайж<br><em>байна уу?</em>' : 'Хамтрагч хайж<br><em>байна уу?</em>'
      $('.role-copy > span').textContent = seeker ? 'Гэрлээ асаагаарай. Танд тохирох сул өрөө, хамтран амьдрагчийг олъё.' : 'Гэрлээ унтраагаарай. Таны сул өрөөнд тохирох хүнийг олъё.'
      $('.role-switch').setAttribute('aria-pressed', String(seeker)); $('.role-switch small').textContent = seeker ? 'ON' : 'OFF'; $('.role-switch strong').textContent = roleText()
      $('.role-ticket').textContent = this.role === 'seeker' ? '● ӨРӨӨ ХАЙГЧ' : '● ӨРӨӨТЭЙ ХҮН'
      select('[data-hair]', 'hair', String(this.profile.hair)); select('[data-skin]', 'skin', this.profile.skin); select('[data-shirt]', 'shirt', this.profile.shirt); select('[data-district]', 'district', this.profile.district)
      for (const button of this.root.querySelectorAll('[data-interest]')) button.classList.toggle('active', this.profile.interests.includes(button.dataset.interest))
      updateAvatar()
      this.renderMatches()
    }
    listen($('.door-button'), 'click', () => { $('.door-step').classList.add('opening'); window.setTimeout(() => setStep('role'), 620) })
    for (const button of this.root.querySelectorAll('.home-button')) listen(button, 'click', () => setStep('door'))
    listen($('.role-switch'), 'click', () => { this.role = this.role === 'seeker' ? 'host' : 'seeker'; update() })
    listen($('.role-next'), 'click', () => setStep('profile'))
    listen($('.back-button'), 'click', event => setStep(event.currentTarget.classList.contains('match-back') ? 'profile' : 'role'))
    for (const button of this.root.querySelectorAll('[data-hair]')) listen(button, 'click', () => { this.profile.hair = Number(button.dataset.hair); update() })
    for (const button of this.root.querySelectorAll('[data-skin]')) listen(button, 'click', () => { this.profile.skin = button.dataset.skin; update() })
    for (const button of this.root.querySelectorAll('[data-shirt]')) listen(button, 'click', () => { this.profile.shirt = button.dataset.shirt; update() })
    for (const button of this.root.querySelectorAll('[data-district]')) listen(button, 'click', () => { this.profile.district = button.dataset.district; update() })
    for (const button of this.root.querySelectorAll('[data-interest]')) listen(button, 'click', () => { const item = button.dataset.interest; this.profile.interests = this.profile.interests.includes(item) ? this.profile.interests.filter(value => value !== item) : this.profile.interests.length < 3 ? [...this.profile.interests, item] : this.profile.interests; update() })
    listen($('.profile-form'), 'submit', event => { event.preventDefault(); this.profile.name = new FormData(event.currentTarget).get('name').trim(); setStep('matches') })
    listen($('.match-grid'), 'click', event => { const card = event.target.closest('[data-person]'); if (!card || !event.target.closest('.heart')) return; const person = people.find(item => item.name === card.dataset.person); this.favourites.has(person.name) ? this.favourites.delete(person.name) : this.favourites.add(person.name); this.renderMatches() })
    this.update = update
    update()
  }
  renderMatches() {
    const matches = people.filter(person => person.role !== this.role).map(person => ({ ...person, match: Math.min(99, person.match + (person.district === this.profile.district ? 3 : 0) + person.interests.filter(item => this.profile.interests.includes(item)).length * 2) })).sort((a, b) => b.match - a.match)
    required('.match-count', this.root).textContent = `${matches.length} өндөр тохирол`
    required('.match-grid', this.root).innerHTML = matches.map((person, index) => `<article class="match-card" data-person="${person.name}"><div class="match-art" style="--card-a:${person.shirt};--card-b:${person.skin}"><span>0${index + 1}</span><b><strong>${person.match}%</strong> тохирол</b>${avatar(person)}<button class="heart" type="button" aria-label="Таалагдсанд нэмэх">${this.favourites.has(person.name) ? '♥' : '♡'}</button></div><div class="match-info"><div><h3>${person.name}, ${person.age}</h3><strong>${person.price}<small>/ сар</small></strong></div><p>${person.district} дүүрэг · ${person.role === 'host' ? 'Сул өрөөтэй' : 'Өрөө хайж байгаа'}</p><span>${person.bio}</span><aside>${person.interests.map(item => `<i>${item}</i>`).join('')}</aside></div></article>`).join('')
  }
}
