'use client'

import { useRef, useState } from 'react'
import gsap from 'gsap'
import PageShell from '../PageShell'
import { useReveal } from '@/lib/reveal'
import s from './Zapis.module.css'

type Fields = { name: string; phone: string; seats: string }

/** Номер приглашения. Сервера нет — собираем на клиенте из времени и случайности. */
function makeNumber() {
  const n = Math.floor(Math.random() * 9000) + 1000
  const d = new Date()
  return `В-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${n}`
}

export default function Zapis() {
  const root = useRef<HTMLDivElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const done = useRef<HTMLDivElement>(null)
  const [values, setValues] = useState<Fields>({ name: '', phone: '', seats: '1' })
  const [empty, setEmpty] = useState<Record<keyof Fields, boolean>>({
    name: false,
    phone: false,
    seats: false,
  })
  const [ticket, setTicket] = useState('')

  useReveal(root, { stagger: 0.07 })

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    if (empty[k]) setEmpty((s) => ({ ...s, [k]: false }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    const blank = {
      name: !values.name.trim(),
      phone: !values.phone.trim(),
      seats: !values.seats.trim(),
    }
    setEmpty(blank)
    if (blank.name || blank.phone || blank.seats) {
      // мягко: поле подсвечено, форма чуть качнулась — без красных крестов
      gsap.fromTo(
        form.current,
        { x: -5 },
        { x: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' },
      )
      return
    }

    const number = makeNumber()
    setTicket(number)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      gsap.set(form.current, { display: 'none' })
      gsap.set(done.current, { opacity: 1, visibility: 'visible' })
      return
    }

    // поля уходят, на их месте прорисовывается номер
    gsap
      .timeline()
      .to(form.current!.querySelectorAll('[data-out]'), {
        y: -14,
        opacity: 0,
        duration: 0.45,
        stagger: 0.05,
        ease: 'power3.in',
      })
      .set(form.current, { display: 'none' })
      .set(done.current, { visibility: 'visible', opacity: 1 })
      .fromTo(
        done.current!.querySelectorAll('[data-char]'),
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.035, ease: 'power3.out' },
      )
      .fromTo(
        done.current!.querySelectorAll('[data-line]'),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' },
        '-=0.35',
      )
  }

  return (
    <PageShell title="ЗАПИСЬ">
      <div className={s.wrap} ref={root}>
        <div data-reveal-group>
          <h1 className="t-page" data-reveal-fade>
            Пригласительный
            <br />
            билет
          </h1>
          <p className={s.lede} data-reveal-fade>
            Мест немного, и они не продаются. Оставьте имя и телефон — если вы
            в списке, мы подтвердим и пришлём координаты подъёма.
          </p>
        </div>

        <div className={s.ticket} data-reveal-fade>
          <span className={s.stamp} aria-hidden="true">
            ВАЛЬМОНТ · 14 ФЕВРАЛЯ
          </span>

          <form className={s.form} ref={form} onSubmit={submit} noValidate>
            <label className={s.field} data-empty={empty.name} data-out>
              <span className={s.label}>Имя</span>
              <input
                className={s.input}
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Как вас записать"
                value={values.name}
                onChange={set('name')}
              />
            </label>

            <label className={s.field} data-empty={empty.phone} data-out>
              <span className={s.label}>Телефон</span>
              <input
                className={s.input}
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="+7"
                value={values.phone}
                onChange={set('phone')}
              />
            </label>

            <label className={s.field} data-empty={empty.seats} data-out>
              <span className={s.label}>Мест</span>
              <input
                className={s.input}
                type="number"
                name="seats"
                min={1}
                max={6}
                inputMode="numeric"
                value={values.seats}
                onChange={set('seats')}
              />
            </label>

            <button className={s.submit} type="submit" data-out>
              Отправить
              <svg viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path
                  d="M4.4 10.6 10.6 4.4M5.6 4.4h5v5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>

          <div className={s.done} ref={done} aria-live="polite">
            <span className={s.doneLabel} data-line>
              Номер приглашения
            </span>
            <span className={s.number}>
              {ticket.split('').map((ch, i) => (
                <span data-char key={`${ch}-${i}`}>
                  {ch}
                </span>
              ))}
            </span>
            <span className={s.donePromise} data-line>
              Мы напишем вам до 1 февраля.
            </span>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
