import Joyride from 'react-joyride';

export default function AppTour({ run, setRun }: any) {
  const steps = [
    {
      target: '.time-in-button',
      content: 'Click here to record your Time In.',
    },
    {
      target: '.history-page',
      content: 'View your attendance history here.',
    },
    {
      target: '.edit-button',
      content: 'You can edit your records here.',
    },
    {
      target: '.download-dtr',
      content: 'Download your DTR here.',
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
