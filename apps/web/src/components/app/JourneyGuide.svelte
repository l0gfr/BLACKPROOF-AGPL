<script lang="ts">
  type JourneyStepState = "done" | "current" | "upcoming";

  type JourneyStep = {
    label: string;
    state: JourneyStepState;
  };

  let {
    title,
    reason,
    actionLabel = "",
    actionHref = "",
    steps = [],
    sticky = false,
    compact = false,
  }: {
    title: string;
    reason: string;
    actionLabel?: string;
    actionHref?: string;
    steps?: JourneyStep[];
    sticky?: boolean;
    compact?: boolean;
  } = $props();
</script>

<aside
  class:sticky
  class:compact
  class="journey-guide"
  aria-labelledby="journey-guide-title"
  data-blackproof-guide="true"
>
  <div class="guide-main">
    <div class="guide-copy">
      <span class="guide-kicker"><i aria-hidden="true"></i> Prochaine étape</span>
      <strong id="journey-guide-title">{title}</strong>
      <p>{reason}</p>
    </div>

    {#if actionLabel && actionHref}
      <a class="button primary guide-action" href={actionHref}>
        {actionLabel}
        <span aria-hidden="true">→</span>
      </a>
    {/if}
  </div>

  {#if steps.length > 0}
    <ol class="guide-steps" aria-label="Progression du dossier">
      {#each steps as step, index}
        <li class={step.state} aria-current={step.state === "current" ? "step" : undefined}>
          <span>{step.state === "done" ? "✓" : index + 1}</span>
          <small>{step.label}</small>
        </li>
      {/each}
    </ol>
  {/if}
</aside>

<style>
  .journey-guide {
    position: relative;
    z-index: 10;
    margin: 0 0 1.25rem;
    overflow: hidden;
    border: 1px solid rgba(196, 218, 207, 0.1);
    border-radius: 18px;
    background:
      linear-gradient(110deg, rgba(129, 218, 203, 0.075), transparent 42%),
      rgba(16, 22, 20, 0.68);
    box-shadow: 0 18px 54px rgba(0, 0, 0, 0.12);
  }

  .journey-guide.sticky {
    position: sticky;
    top: 4.6rem;
    backdrop-filter: blur(16px);
  }

  .journey-guide.compact {
    border-radius: 14px;
  }

  .journey-guide.compact .guide-main {
    padding: 0.78rem 1rem 0.68rem;
  }

  .journey-guide.compact .guide-copy > strong {
    margin-top: 0.28rem;
    font-size: 0.98rem;
  }

  .journey-guide.compact .guide-copy p {
    margin-top: 0.2rem;
    font-size: 0.76rem;
    line-height: 1.35;
  }

  .journey-guide.compact .guide-action {
    min-height: 2.35rem;
    padding-inline: 0.8rem;
  }

  .journey-guide.compact .guide-steps {
    padding: 0 1rem 0.65rem;
  }

  .journey-guide.compact .guide-steps li {
    padding: 0.45rem 0.35rem 0.2rem;
  }

  .guide-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.3rem 1.45rem 1.15rem;
  }

  .guide-copy {
    min-width: 0;
  }

  .guide-kicker {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--accent);
    font-size: 0.64rem;
    font-weight: 680;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .guide-kicker i {
    width: 0.48rem;
    height: 0.48rem;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 0 5px rgba(121, 216, 200, 0.1);
  }

  .guide-copy > strong {
    display: block;
    margin-top: 0.5rem;
    color: var(--text);
    font-family: var(--font-body);
    font-size: clamp(1.06rem, 2vw, 1.3rem);
    font-weight: 610;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }

  .guide-copy p {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.84rem;
    line-height: 1.55;
  }

  .guide-action {
    flex: 0 0 auto;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding-inline: 1.05rem;
    white-space: nowrap;
  }

  .guide-action span {
    font-size: 1rem;
  }

  .guide-steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    margin: 0;
    padding: 0.2rem 1.45rem 1.15rem;
    border-top: 0;
    list-style: none;
  }

  .guide-steps li {
    --step-accent: var(--accent);
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    padding: 0.65rem 0.45rem 0.5rem;
    border: 0;
    border-top: 1px solid var(--line);
    border-radius: 0;
    color: var(--muted-2);
    background: transparent;
  }

  .guide-steps li + li {
    border-left-color: transparent;
  }

  .guide-steps li.current {
    color: var(--text);
    border-top-color: var(--step-accent);
    background: transparent;
  }

  .guide-steps li.done {
    color: #b4beb8;
    background: transparent;
  }

  .guide-steps li > span {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 1.3rem;
    height: 1.3rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: inherit;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 760;
  }

  .guide-steps li.current > span,
  .guide-steps li.done > span {
    border-color: color-mix(in srgb, var(--step-accent) 48%, transparent);
    color: var(--step-accent);
  }

  .guide-steps li:nth-child(2) {
    --step-accent: var(--accent-blue);
  }

  .guide-steps li:nth-child(3) {
    --step-accent: var(--accent-violet);
  }

  .guide-steps li:nth-child(4) {
    --step-accent: var(--accent-gold);
  }

  .guide-steps small {
    overflow: hidden;
    font-size: 0.75rem;
    font-weight: 610;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 700px) {
    .journey-guide.sticky {
      top: 4.25rem;
    }

    .guide-main {
      align-items: stretch;
      flex-direction: column;
    }

    .guide-action {
      align-self: flex-start;
      white-space: normal;
    }

    .guide-steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding-inline: 0.9rem;
      gap: 0.35rem 0.7rem;
    }

    .guide-steps li:nth-child(3) {
      border-left-color: transparent;
      border-top-color: transparent;
    }

    .guide-steps li:nth-child(4) {
      border-top-color: transparent;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .journey-guide.sticky {
      backdrop-filter: none;
    }
  }
</style>
