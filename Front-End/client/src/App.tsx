import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  PropertyCard,
  Radio,
  RoommateCard,
  Select,
  Switch,
  Tabs,
  Textarea,
  TextInput,
  type ButtonVariant,
} from './design-system/components'
import { ThemeEditor } from './design-system/ThemeEditor'
import { useTheme } from './design-system/useTheme'
import { resolvedColor, themeTokens } from './design-system/theme'
import roommateImage from './design-system/assets/roommate.jpg'
import propertyImage from './design-system/assets/property-source.png'
import './App.css'

const sections = [
  'Foundations',
  'Typography',
  'Actions',
  'Forms',
  'Feedback',
  'Marketplace',
]
const buttonVariants: ButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'destructive',
]
const colorTokens = themeTokens.filter((token) => token.color)
function SectionHeading({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="section-heading">
      <span className="section-number">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}
function App() {
  const theme = useTheme()
  const [tab, setTab] = useState('roommates')
  const [notifications, setNotifications] = useState(true)
  const [roommateSaved, setRoommateSaved] = useState(false)
  const [propertySaved, setPropertySaved] = useState(false)
  const [alertVisible, setAlertVisible] = useState(true)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [profileVisible, setProfileVisible] = useState(false)
  const emailError =
    submitted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Зөв и-мэйл хаяг оруулна уу.'
      : undefined
  const roommate = (
    <RoommateCard
      image={roommateImage}
      imageAlt="Номингийн профайл зураг"
      name="Номин, 24"
      occupation="UX дизайнер · MCS"
      location="Сүхбаатар · 8-р хороо"
      budget="750,000 ₮ / сар"
      moveInDate="2026.11.01-ээс нүүнэ"
      compatibility="94% тохирно"
      traits={['Тамхи татдаггүй', 'Цэвэрч', 'Амьтанд дуртай']}
      saved={roommateSaved}
      onSave={() => setRoommateSaved((value) => !value)}
      onView={() => setProfileVisible((value) => !value)}
    />
  )
  const property = (
    <PropertyCard
      image={propertyImage}
      imageAlt="Нарлаг, тавилгатай хувийн өрөө"
      title="Нарлаг, тавилгатай хувийн өрөө"
      location="Сүхбаатар · 8-р хороо"
      rent="850,000 ₮ / сар"
      roomType="Хувийн өрөө · 2 хамтран амьдрагч"
      availability="2026.11.01-ээс боломжтой"
      traits={['Wi-Fi', 'Тавилгатай']}
      saved={propertySaved}
      onSave={() => setPropertySaved((value) => !value)}
    />
  )
  return (
    <>
      <a className="skip-link" href="#main">
        Үндсэн хэсэг рүү очих
      </a>
      <header className="site-header">
        <a href="#" className="brand">
          hamtry<span>®</span>
        </a>
        <span className="edition">
          DESIGN SYSTEM <span> / </span> V1.0
        </span>
        <div className="header-actions">
          <ThemeEditor {...theme} />
          <a
            className="figma-link"
            href="https://www.figma.com/design/LPm4B10FkuJyly7Ck2SNNM/Hamtry?node-id=13-29"
          >
            Open in Figma ↗
          </a>
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <p className="eyebrow">THE LIBRARY</p>
          <nav aria-label="Design system sections">
            {sections.map((section, index) => (
              <a key={section} href={`#${section.toLowerCase()}`}>
                <span>0{index + 1}</span>
                {section}
              </a>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="status-dot" />
            Shared CSS variables
            <p>
              One shared visual language.
              <br />
              Built for Hamtry.
            </p>
          </div>
        </aside>
        <main id="main">
          <section className="intro">
            <div>
              <p className="eyebrow">HAMTRY / FOUNDATIONS & COMPONENTS</p>
              <h1>
                A little closer.
                <br />
                <span>A place to belong.</span>
              </h1>
              <p className="intro-description">
                Хамт амьдрахад илүү ойр.
                <br />
                Тайван өнгө, ойлгомжтой үйлдэл, итгэлтэй холбоо.
              </p>
              <div className="intro-actions">
                <a className="ht-button ht-button--primary" href="#actions">
                  Explore components ↓
                </a>
                <span>Designed in Figma. Built in React.</span>
              </div>
            </div>
            <div className="brand-specimen">
              <span>OUR VISUAL LANGUAGE</span>
              <div className="specimen-word">
                hamtry<span>®</span>
              </div>
              <div className="specimen-footer">
                <span>
                  Fresh lime.
                  <br />
                  Soft pink.
                </span>
                <span>
                  {resolvedColor(
                    colorTokens.find(
                      (token) => token.name === 'brand/primary',
                    )!,
                    theme.overrides,
                  )
                    .slice(1)
                    .toUpperCase()}
                  <br />
                  {resolvedColor(
                    colorTokens.find(
                      (token) => token.name === 'brand/accent-lime',
                    )!,
                    theme.overrides,
                  )
                    .slice(1)
                    .toUpperCase()}
                </span>
              </div>
            </div>
          </section>
          <div className="library-stats">
            <div>
              <strong>{colorTokens.length}</strong>
              <span>Semantic colors</span>
            </div>
            <div>
              <strong>13</strong>
              <span>Type styles</span>
            </div>
            <div>
              <strong>4px</strong>
              <span>Spacing rhythm</span>
            </div>
            <div>
              <strong>CSS</strong>
              <span>Framework independent tokens</span>
            </div>
          </div>
          <section id="foundations">
            <SectionHeading
              number="01"
              title="Foundations"
              description="Purposeful color. A consistent rhythm. Shared variables for your component library."
            />
            <div className="color-grid">
              {colorTokens.map((token) => {
                const hex = resolvedColor(token, theme.overrides).toUpperCase()
                return (
                  <div className="color-token" key={token.name}>
                    <div style={{ backgroundColor: hex }} />
                    <strong>{token.name}</strong>
                    <span>{hex}</span>
                  </div>
                )
              })}
            </div>
            <div className="foundation-details">
              <div>
                <h3>Spacing / 4px base</h3>
                <div className="spacing-scale">
                  {[4, 8, 12, 16, 24, 32, 48, 64].map((size) => (
                    <div key={size}>
                      <span style={{ height: size }} />
                      <small>{size}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>Corner radius</h3>
                <div className="radius-scale">
                  {[4, 8, 12, 16].map((radius) => (
                    <div key={radius} style={{ borderRadius: radius }}>
                      {radius}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section id="typography">
            <SectionHeading
              number="02"
              title="Typography"
              description="Inter. Clear, welcoming, and ready for Mongolian content."
            />
            <div className="type-sheet">
              {[
                ['display-lg', 'Display / 56', 'Хамтдаа, илүү тухтай.'],
                [
                  'heading-h1',
                  'Heading / 36',
                  'Өөрт тохирох хамтрагчаа олоорой.',
                ],
                ['heading-h3', 'Heading / 24', 'Шинэ эхлэл эндээс'],
                [
                  'body-md',
                  'Body / 16',
                  'Амьдралын хэв маяг, сонирхол, хэрэгцээндээ тохирох хамтрагчтай холбогдоорой.',
                ],
                ['label-md', 'Label / 14', 'Профайл харах'],
                [
                  'caption',
                  'Caption / 12',
                  'Таны мэдээллийг бусдад харуулахгүй.',
                ],
              ].map(([style, label, sample]) => (
                <div className="type-row" key={style}>
                  <span>{label}</span>
                  <p className={`type-${style}`}>{sample}</p>
                </div>
              ))}
            </div>
          </section>
          <section id="actions">
            <SectionHeading
              number="03"
              title="Actions"
              description="Five intentions. Three sizes. Clear feedback for every interaction."
            />
            <div className="sample-surface">
              <div className="sample-row">
                {buttonVariants.map((variant) => (
                  <div className="labeled-sample" key={variant}>
                    <Button
                      variant={variant}
                      onClick={() => {
                        setAlertVisible(true)
                        document
                          .getElementById('feedback')
                          ?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      {variant === 'destructive' ? 'Устгах' : 'Профайл харах'}
                    </Button>
                    <small>{variant}</small>
                  </div>
                ))}
              </div>
              <div className="sample-row divided">
                <Button size="sm">Small</Button>
                <Button>Medium</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Disabled</Button>
                <Button loading>Loading</Button>
              </div>
            </div>
          </section>
          <section id="forms">
            <SectionHeading
              number="04"
              title="Forms & preferences"
              description="Visible labels, helpful errors, and familiar native controls."
            />
            <form
              className="sample-surface"
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                setSubmitted(true)
              }}
            >
              <div className="form-grid">
                <TextInput
                  label="И-мэйл хаяг"
                  type="email"
                  placeholder="name@example.mn"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  helperText="Таны мэдээллийг бусдад харуулахгүй."
                  error={emailError}
                />
                <Select
                  label="Дүүрэг сонгох"
                  defaultValue=""
                  helperText="Хайлт хийх дүүргээ сонгоно уу."
                >
                  <option value="" disabled>
                    Дүүрэг сонгох
                  </option>
                  <option>Сүхбаатар</option>
                  <option>Хан-Уул</option>
                  <option>Баянзүрх</option>
                </Select>
                <TextInput
                  label="Утасны дугаар"
                  placeholder="Утасны дугаараа оруулна уу"
                  error="Утасны дугаар 8 оронтой байна."
                />
                <TextInput
                  label="Баталгаажсан хаяг"
                  value="nomin@example.mn"
                  readOnly
                  helperText="Read-only"
                />
                <Textarea
                  label="Өөрийн тухай"
                  placeholder="Өөрийн тухай бичнэ үү"
                  helperText="Хамт амьдрах хүндээ өөрийгөө танилцуулаарай."
                />
                <TextInput
                  label="Одоогоор боломжгүй"
                  placeholder="Disabled"
                  disabled
                />
              </div>
              <div className="controls-grid">
                <div>
                  <Checkbox label="Тамхи татдаггүй" defaultChecked />
                  <Checkbox label="Амьтанд дуртай" />
                  <Checkbox label="Бүгдийг сонгох" indeterminate />
                </div>
                <fieldset>
                  <legend>Өрөөний төрөл</legend>
                  <Radio label="Хувийн өрөө" name="room-type" defaultChecked />
                  <Radio label="Хамтын өрөө" name="room-type" />
                </fieldset>
                <div>
                  <Switch
                    label="Мэдэгдэл хүлээн авах"
                    checked={notifications}
                    onChange={setNotifications}
                  />
                  <Checkbox label="Боломжгүй сонголт" disabled />
                </div>
              </div>
              <div className="form-footer">
                <Button type="submit">Мэдээлэл шалгах</Button>
                <span aria-live="polite">
                  {submitted && !emailError
                    ? 'И-мэйл хаяг зөв байна.'
                    : 'Try submitting to see validation.'}
                </span>
              </div>
            </form>
          </section>
          <section id="feedback">
            <SectionHeading
              number="05"
              title="Feedback & navigation"
              description="Status always has a label. Tabs support arrow keys, Home, and End."
            />
            <div className="sample-surface">
              <div className="sample-row">
                <Badge>Цэвэрч</Badge>
                <Badge tone="success">✓ Баталгаажсан</Badge>
                <Badge tone="warning">Хүлээгдэж буй</Badge>
                <Badge tone="error">Алдаа</Badge>
                <Badge tone="info">Мэдээлэл</Badge>
              </div>
              <div className="alerts-grid">
                {alertVisible ? (
                  <Alert
                    title="Мэдээллээ баталгаажуулаарай"
                    onDismiss={() => setAlertVisible(false)}
                  >
                    Итгэлтэй, аюулгүй хамтран амьдрах эхний алхам.
                  </Alert>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setAlertVisible(true)}
                  >
                    Мэдэгдэл харуулах
                  </Button>
                )}
                <Alert title="Амжилттай хадгаллаа" tone="success">
                  Таны сонголт шинэчлэгдлээ.
                </Alert>
                <Alert title="Мэдээллээ шалгана уу" tone="warning">
                  Профайлаа бүрэн бөглөж дуусгаарай.
                </Alert>
                <Alert title="Дахин оролдоно уу" tone="error">
                  Шаардлагатай мэдээлэл дутуу байна.
                </Alert>
              </div>
              <Tabs
                label="Хайх төрөл"
                value={tab}
                onChange={setTab}
                tabs={[
                  {
                    id: 'roommates',
                    label: 'Roommate',
                    content: 'Өөрт тохирох хамтрагчаа олоорой.',
                  },
                  {
                    id: 'rooms',
                    label: 'Өрөө',
                    content: 'Тухтай өрөөгөө олоорой.',
                  },
                  {
                    id: 'saved',
                    label: 'Хадгалсан',
                    content: `Хадгалсан: ${Number(roommateSaved) + Number(propertySaved)}`,
                  },
                ]}
              />
            </div>
          </section>
          <section id="marketplace">
            <SectionHeading
              number="06"
              title="Marketplace"
              description="The system in context. Real Figma imagery and reusable listing components."
            />
            <div className="marketplace-grid">
              {roommate}
              {property}
              <div className="marketplace-note">
                <span className="eyebrow">BUILT FOR CONNECTION</span>
                <h3>
                  People first.
                  <br />
                  Details that matter.
                </h3>
                <p>
                  Баталгаажуулалт, төсөв, байршил, амьдралын хэв маяг — нэг дор.
                </p>
                <Badge tone="success">94% тохирно</Badge>
                <p className="caption">
                  Try the heart buttons to save a listing.
                </p>
                {profileVisible && (
                  <Alert title="Номин, 24" tone="success">
                    UX дизайнер · MCS. Тамхи татдаггүй, цэвэрч, амьтанд дуртай.
                  </Alert>
                )}
              </div>
            </div>
          </section>
          <footer className="page-footer">
            <span className="brand">
              hamtry<span>®</span>
            </span>
            <p>A shared language for a shared home.</p>
            <span>DESIGN SYSTEM / 2026</span>
          </footer>
        </main>
      </div>
    </>
  )
}
export default App
