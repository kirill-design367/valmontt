"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Porog from "./Porog";
import { FULL } from "@/lib/reveal";
import AppLink from "../AppLink";
import { useReveal } from "@/lib/reveal";
import { useLetterAssembly } from "@/lib/letters";
import s from "./Home.module.css";

const MANIFEST = [
  "Одна ночь. Один зал.",
  "Двести человек.",
  "Каждый нашёл дорогу сам.",
];

const SLOTS = [
  { time: "21:00", name: "Сбор" },
  { time: "00:00", name: "Основной сет" },
  { time: "04:00", name: "Закрытие" },
];

/** Четыре правила входа — те же, что развёрнуты на /gosti. */
const ENTRY = [
  { name: "СПИСОК", note: "Закрывается за месяц" },
  { name: "ПРИГЛАШЕНИЕ", note: "На бумаге, на одного" },
  { name: "ТЕЛЕФОНЫ", note: "Сдаются на въезде" },
  { name: "СЪЁМКА", note: "Запрещена везде" },
];

const FINAL_DATE = ["Одна ночь в году"];

gsap.registerPlugin(ScrollTrigger);

export default function HomeFlow() {
  const root = useRef<HTMLDivElement>(null);
  const finalWrap = useRef<HTMLDivElement>(null);
  useReveal(root, { stagger: 0.08 });
  useLetterAssembly(root);

  /* Схлопывание блока с датой. Привязано к скроллу, а не к таймеру:
     скоростью управляет пользователь. */
  useEffect(() => {
    const box = finalWrap.current;
    if (!box) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(`${FULL} and (min-width: 768px)`, () => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: box,
              start: "bottom 92%",
              end: "bottom 22%",
              scrub: 0.6,
            },
          })
          .to(
            "[data-collapse-body]",
            { scaleY: 0.24, autoAlpha: 0, ease: "power2.in" },
            0,
          )
          .to("[data-collapse-veil]", { opacity: 1, ease: "power2.in" }, 0);
      });

      // на телефоне только сжатие по вертикали, без наплыва от краёв
      mm.add(`${FULL} and (max-width: 767px)`, () => {
        gsap.to("[data-collapse-body]", {
          scaleY: 0.3,
          autoAlpha: 0,
          ease: "power2.in",
          scrollTrigger: {
            trigger: box,
            start: "bottom 92%",
            end: "bottom 30%",
            scrub: 0.6,
          },
        });
      });
    }, box);
    return () => ctx.revert();
  }, []);

  return (
    <div className={s.flow} ref={root}>
      {/* hero остаётся неподвижным первым экраном — лента наезжает на него */}
      <div className={s.heroSpacer} aria-hidden="true" />

      {/* ---------- Манифест ---------- */}
      <section className={`${s.section} ${s.manifest}`} data-reveal-group>
        {MANIFEST.map((phrase) => (
          <span className={`${s.line} ${s.free}`} key={phrase}>
            <span data-letters>{phrase}</span>
          </span>
        ))}
      </section>

      {/* ---------- Тизер программы ---------- */}
      <section className={s.section} data-reveal-group>
        <span className={s.line}>
          <span className="t-block" data-reveal style={{ display: "block" }}>
            Три точки ночи
          </span>
        </span>

        <div className={s.slots}>
          {SLOTS.map((slot) => (
            <AppLink
              className={s.slot}
              href="/programma"
              key={slot.time}
              data-reveal-fade
            >
              <span className={s.slotTime} data-letters>
                {slot.time}
              </span>
              <span className={s.slotName}>{slot.name}</span>
            </AppLink>
          ))}
        </div>
      </section>

      {/* ---------- Тизер входа ---------- */}
      <section className={s.section} data-reveal-group>
        <span className={s.line}>
          <span className="t-block" data-reveal style={{ display: "block" }}>
            Вход
          </span>
        </span>

        <p className={s.teaser} data-reveal-fade>
          Как сюда попадают
        </p>

        <div className={s.entries}>
          {ENTRY.map((rule) => (
            <AppLink
              className={s.entryCard}
              href="/gosti"
              key={rule.name}
              data-reveal-fade
              aria-label={`${rule.name} — правила входа`}
            >
              <span className={s.entryName}>{rule.name}</span>
              <span className={s.entryNote}>{rule.note}</span>
            </AppLink>
          ))}
        </div>
      </section>

      {/* ---------- Финал ---------- */}
      <div className={s.finalWrap} ref={finalWrap}>
        <span className={s.collapse} data-collapse-veil aria-hidden="true" />
        <section className={`${s.section} ${s.final}`} data-reveal-group>
          <div className={s.finalInner} data-collapse-body>
            <div className={s.finalDate}>
              {FINAL_DATE.map((d) => (
                <span className={`${s.line} ${s.free}`} key={d}>
                  <span data-letters>{d}</span>
                </span>
              ))}
            </div>
            <p className={s.finalPlace} data-reveal-fade>
              Вальмонт, верхний зал
            </p>
            <AppLink className={s.finalCta} href="/zapis" data-reveal-fade>
              Замок
              <svg viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path
                  d="M4.4 10.6 10.6 4.4M5.6 4.4h5v5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </AppLink>
          </div>
        </section>
      </div>

      {/* ---------- Порог: слово целиком, впервые за весь сайт ---------- */}
      <Porog />
    </div>
  );
}
