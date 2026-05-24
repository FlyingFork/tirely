import Link from 'next/link';

import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Layers,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { Badge, Box, Button, Card, Flex, Grid, Heading, Separator, Text } from '@radix-ui/themes';

import PublicNavbar from '@/components/layout/PublicNavbar';

import styles from './page.module.css';

const proofPoints = [
  'Track every tire from depot stock to mounted position.',
  'Keep inspections, mileage, and maintenance in one operating flow.',
  'Surface compliance, replacement pressure, and cost trends early.',
];

const capabilities = [
  {
    title: 'Fleet structure',
    description: 'Organize depots, vehicles, drivers, and access in a single workspace.',
    icon: Building2,
    items: ['Depots', 'Vehicles', 'Drivers', 'Users'],
  },
  {
    title: 'Tire operations',
    description: 'Register tires, group tire sets, mount, dismount, rotate, and monitor fitment.',
    icon: Gauge,
    items: ['Tires', 'Tire sets', 'Stock visibility', 'Position history'],
  },
  {
    title: 'Inspection flow',
    description: 'Run daily checks and detailed inspections with tire-level inspection results.',
    icon: ClipboardList,
    items: ['Daily checks', 'Detailed inspections', 'Tread capture', 'Activity history'],
  },
  {
    title: 'Maintenance control',
    description: 'Log work performed, connect it to vehicles and tires, and keep service context.',
    icon: Wrench,
    items: ['Maintenance log', 'Retreading flow', 'Service notes', 'Linked tire activity'],
  },
  {
    title: 'Operational insight',
    description:
      'See health, forecast replacement pressure, monitor compliance, and benchmark lifespan.',
    icon: BarChart3,
    items: ['Health distribution', 'Replacement forecast', 'Compliance', 'Cost summary'],
  },
  {
    title: 'Platform governance',
    description:
      'Support onboarding, audit visibility, and settings that shape scoring and stale thresholds.',
    icon: ShieldCheck,
    items: ['Company requests', 'Audit logs', 'Settings', 'Role-based access'],
  },
];

const workflow = [
  {
    step: '01',
    title: 'Set up the operation',
    description:
      'Register the company, define depots, add vehicles, invite users, and assign drivers.',
    icon: Warehouse,
  },
  {
    step: '02',
    title: 'Register tire inventory',
    description:
      'Create tire records, track in-stock assets, and build tire sets when teams work in grouped fitments.',
    icon: Layers,
  },
  {
    step: '03',
    title: 'Run field activity',
    description:
      'Capture mileage, daily checks, detailed inspections, and maintenance as the fleet keeps moving.',
    icon: Truck,
  },
  {
    step: '04',
    title: 'Act on insight',
    description:
      'Use health signals, compliance status, and lifecycle reporting to plan service and replacement.',
    icon: ScrollText,
  },
];

const insights = [
  {
    title: 'Tire health distribution',
    description: 'Shows where active tires sit across current usage buckets.',
  },
  {
    title: 'Replacement forecast',
    description: 'Highlights mounted tires expected to cross usage limits soon.',
  },
  {
    title: 'Inspection compliance',
    description: 'Measures how many vehicles remain within the inspection freshness threshold.',
  },
  {
    title: 'Brand and model benchmarking',
    description: 'Compares disposed tire lifespan against expected performance.',
  },
  {
    title: 'Cost summary',
    description: 'Aggregates maintenance event costs over time for operational review.',
  },
];

const roles = [
  {
    title: 'Fleet managers',
    description: 'Stay on top of fleet structure, compliance exposure, and replacement planning.',
    icon: Users,
  },
  {
    title: 'Maintenance teams',
    description:
      'Manage tire condition, service events, mounting operations, and retreading context.',
    icon: Wrench,
  },
  {
    title: 'Drivers',
    description:
      'Contribute mileage and inspection activity with clearer context around assigned vehicles.',
    icon: UserRound,
  },
  {
    title: 'Platform admins',
    description: 'Review onboarding requests, manage companies, and oversee platform activity.',
    icon: Settings,
  },
];

export default function HomePage() {
  return (
    <>
      <PublicNavbar />
      <Box className={styles.page}>
        <main className={styles.main}>
          <section className={`${styles.section} ${styles.heroSection}`}>
            <div className={styles.shell}>
              <Grid columns={{ initial: '1', lg: '2' }} gap={{ initial: '6', lg: '8' }}>
                <Flex direction="column" gap="5" className={styles.heroCopy}>
                  <Flex direction="column" gap="3" align="start">
                    <Badge size="2" color="cyan" variant="soft">
                      Fleet Tire Intelligence
                    </Badge>
                    <Heading size={{ initial: '8', lg: '9' }} className={styles.heroTitle}>
                      Tire lifecycle management built for real fleet operations.
                    </Heading>
                    <Text size="4" color="gray" className={styles.heroText}>
                      Tirely gives commercial fleets one place to track tires, vehicles, depots,
                      inspections, maintenance, and the reporting needed to act before cost and
                      compliance issues spread.
                    </Text>
                  </Flex>

                  <Grid columns={{ initial: '1', sm: '3' }} gap="3">
                    {proofPoints.map((point) => (
                      <Card key={point} size="2" className={styles.proofCard}>
                        <div className={styles.proofPointRow}>
                          <CheckCircle2 size={14} className={styles.proofIcon} />
                          <Text size="2" className={styles.proofText}>
                            {point}
                          </Text>
                        </div>
                      </Card>
                    ))}
                  </Grid>

                  <Flex gap="3" wrap="wrap">
                    <Button size="3" asChild>
                      <Link href="/request">
                        Register your company
                        <ArrowRight size={16} />
                      </Link>
                    </Button>
                    <Button size="3" variant="soft" color="gray" asChild>
                      <Link href="#how-it-works">How it works</Link>
                    </Button>
                  </Flex>
                </Flex>

                <div className={`${styles.heroVisual} anim-slide-up`}>
                  <Card size="3" className={styles.heroBoard}>
                    <Flex direction="column" gap="4">
                      <Flex align="start" justify="between" gap="3" wrap="wrap">
                        <Box>
                          <Text size="2" color="gray">
                            Operating overview
                          </Text>
                          <Heading size="5" mt="1">
                            Commercial fleet workspace
                          </Heading>
                        </Box>
                        <Badge color="green" variant="soft">
                          Live operations
                        </Badge>
                      </Flex>

                      <Grid columns="2" gap="3">
                        <Card size="1" className={styles.metricCard}>
                          <Text size="1" color="gray">
                            Vehicles in service
                          </Text>
                          <Heading size="6">248</Heading>
                          <Text size="1" color="gray">
                            Across 6 depots
                          </Text>
                        </Card>
                        <Card size="1" className={styles.metricCard}>
                          <Text size="1" color="gray">
                            Inspection compliance
                          </Text>
                          <Heading size="6">92%</Heading>
                          <Text size="1" color="gray">
                            19 vehicles overdue
                          </Text>
                        </Card>
                        <Card size="1" className={styles.metricCard}>
                          <Text size="1" color="gray">
                            Mounted tires tracked
                          </Text>
                          <Heading size="6">1,486</Heading>
                          <Text size="1" color="gray">
                            Health scoring active
                          </Text>
                        </Card>
                        <Card size="1" className={styles.metricCard}>
                          <Text size="1" color="gray">
                            Maintenance this month
                          </Text>
                          <Heading size="6">64</Heading>
                          <Text size="1" color="gray">
                            Linked to tire history
                          </Text>
                        </Card>
                      </Grid>

                      <Card size="2" className={styles.activityCard}>
                        <Flex direction="column" gap="3">
                          <Flex justify="between" align="center" gap="3">
                            <Heading size="3">Active operating loop</Heading>
                            <Badge color="cyan" variant="soft">
                              Today
                            </Badge>
                          </Flex>
                          <div className={styles.activityList}>
                            <div className={styles.activityItem}>
                              <ClipboardList size={16} />
                              <Text size="2">Detailed inspection logged for vehicle CT-204</Text>
                            </div>
                            <div className={styles.activityItem}>
                              <Gauge size={16} />
                              <Text size="2">
                                Front axle fitment warning cleared after rotation
                              </Text>
                            </div>
                            <div className={styles.activityItem}>
                              <BarChart3 size={16} />
                              <Text size="2">12 tires approaching replacement threshold</Text>
                            </div>
                          </div>
                        </Flex>
                      </Card>
                    </Flex>
                  </Card>
                </div>
              </Grid>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.shell}>
              <Flex direction="column" gap="3" className={styles.sectionIntro}>
                <Badge size="2" color="gray" variant="soft">
                  What Tirely is
                </Badge>
                <Heading size="7" className={styles.sectionTitle}>
                  A focused operating system for tire-heavy fleet work.
                </Heading>
                <Text size="3" color="gray" className={styles.sectionText}>
                  Tirely is built for teams that need clearer control over tire lifecycle,
                  inspection discipline, maintenance history, and reporting across multiple depots
                  and vehicles. The platform stays grounded in daily operational work instead of
                  abstract asset tracking.
                </Text>
              </Flex>
            </div>
          </section>

          <section className={`${styles.section} ${styles.bandSection}`}>
            <div className={styles.shell}>
              <Flex direction="column" gap="4" className={styles.sectionIntro}>
                <Badge size="2" color="cyan" variant="soft">
                  Platform capabilities
                </Badge>
                <Heading size="7" className={styles.sectionTitle}>
                  Everything the platform manages, in one place.
                </Heading>
              </Flex>

              <div className={styles.capabilityGrid}>
                {capabilities.map(({ title, description, icon: Icon, items }) => (
                  <Card key={title} size="3" className={styles.featureCard}>
                    <Flex direction="column" gap="4">
                      <Flex align="start" gap="3">
                        <div className={styles.iconWrap}>
                          <Icon size={18} />
                        </div>
                        <Flex direction="column" gap="2">
                          <Heading size="4">{title}</Heading>
                          <Text size="2" color="gray">
                            {description}
                          </Text>
                        </Flex>
                      </Flex>
                      <Flex gap="2" wrap="wrap">
                        {items.map((item) => (
                          <Badge key={item} variant="soft" color="gray">
                            {item}
                          </Badge>
                        ))}
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section id="how-it-works" className={styles.section}>
            <div className={styles.shell}>
              <Grid columns={{ initial: '1', lg: '2' }} gap={{ initial: '6', lg: '8' }}>
                <Flex direction="column" gap="3" className={styles.sectionIntro}>
                  <Badge size="2" color="amber" variant="soft">
                    How it works
                  </Badge>
                  <Heading size="7" className={styles.sectionTitle}>
                    The platform follows the operating cycle teams already run.
                  </Heading>
                  <Text size="3" color="gray" className={styles.sectionText}>
                    Start with operational setup, connect tire inventory to vehicles, keep field
                    activity current, and use the reporting layer to decide what needs attention
                    next.
                  </Text>
                </Flex>

                <Flex direction="column" gap="3">
                  {workflow.map(({ step, title, description, icon: Icon }) => (
                    <Card key={step} size="2" className={styles.workflowCard}>
                      <Flex direction="column" gap="3">
                        <Flex justify="between" align="start" gap="3">
                          <Flex align="start" gap="3">
                            <Badge size="2" color="gray" variant="soft">
                              {step}
                            </Badge>
                            <Box>
                              <Heading size="4">{title}</Heading>
                              <Text size="2" color="gray">
                                {description}
                              </Text>
                            </Box>
                          </Flex>
                          <div className={styles.iconWrap}>
                            <Icon size={18} />
                          </div>
                        </Flex>
                        <Separator size="4" />
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              </Grid>
            </div>
          </section>

          <section className={`${styles.section} ${styles.darkBand}`}>
            <div className={styles.shell}>
              <Grid columns={{ initial: '1', lg: '2' }} gap={{ initial: '6', lg: '8' }}>
                <Flex direction="column" gap="3" className={styles.sectionIntro}>
                  <Badge size="2" color="green" variant="soft">
                    Reporting and insight
                  </Badge>
                  <Heading size="7" className={styles.sectionTitle}>
                    Move from raw activity to decisions that are easier to defend.
                  </Heading>
                  <Text size="3" color="gray" className={styles.sectionText}>
                    Tirely already exposes the reporting surface needed to watch health, service
                    timing, compliance, and lifecycle outcomes without stitching together separate
                    spreadsheets or point tools.
                  </Text>
                </Flex>

                <Grid columns={{ initial: '1', sm: '2' }} gap="3">
                  {insights.map(({ title, description }) => (
                    <Card key={title} size="2" className={styles.insightCard}>
                      <Flex direction="column" gap="2">
                        <Heading size="3">{title}</Heading>
                        <Text size="2" color="gray">
                          {description}
                        </Text>
                      </Flex>
                    </Card>
                  ))}
                </Grid>
              </Grid>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.shell}>
              <Flex direction="column" gap="4" className={styles.sectionIntro}>
                <Badge size="2" color="violet" variant="soft">
                  Who it helps
                </Badge>
                <Heading size="7" className={styles.sectionTitle}>
                  Built for the teams carrying the tire workflow end to end.
                </Heading>
              </Flex>

              <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4">
                {roles.map(({ title, description, icon: Icon }) => (
                  <Card key={title} size="3" className={styles.roleCard}>
                    <Flex direction="column" gap="3">
                      <div className={styles.iconWrap}>
                        <Icon size={18} />
                      </div>
                      <Heading size="4">{title}</Heading>
                      <Text size="2" color="gray">
                        {description}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </div>
          </section>

          <section className={`${styles.section} ${styles.ctaSection}`}>
            <div className={styles.shell}>
              <Card size="3" className={styles.ctaCard}>
                <Grid columns={{ initial: '1', md: '2' }} gap="5" align="center">
                  <Flex direction="column" gap="3">
                    <Badge size="2" color="cyan" variant="soft">
                      Get started
                    </Badge>
                    <Heading size="7" className={styles.sectionTitle}>
                      Bring your fleet into a tire workflow that is easier to run and easier to
                      explain.
                    </Heading>
                    <Text size="3" color="gray" className={styles.sectionText}>
                      Start with company registration, then build out depots, vehicles, tire stock,
                      inspection cadence, and reporting from there.
                    </Text>
                  </Flex>

                  <Flex direction="column" gap="3" align={{ initial: 'start', md: 'end' }}>
                    <Button size="3" asChild>
                      <Link href="/request">
                        Register your company
                        <ArrowRight size={16} />
                      </Link>
                    </Button>
                    <Button size="3" variant="soft" color="gray" asChild>
                      <Link href="/sign-in">Sign in</Link>
                    </Button>
                  </Flex>
                </Grid>
              </Card>
            </div>
          </section>
        </main>
      </Box>
    </>
  );
}
