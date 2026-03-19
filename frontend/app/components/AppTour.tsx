import Joyride from 'react-joyride';

export default function AppTour({ run, setRun }: any) {
  const steps = [
    {
      target: '.tour-timein',
      content: 'Click here to record your Daily Time In and Out.',
      disableBeacon: true,
    },
    {
      target: '.tour-history',
      content: 'View and edit your attendance history here.',
    },
    {
      target: '.tour-leaderboards',
      content: 'Check your rank among other interns.',
    },
    {
      target: '.tour-reports',
      content: 'Generate and download your DTR here.',
    },
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      styles={{
        options: {
          primaryColor: '#166534',
        },
      }}
    />
  );
}
