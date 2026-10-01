import { AlgorithmVideo } from '@/ui/algorithm_video';
import { Simulator } from '@/ui/simulator';

/**
 * The video opens the page: it explains the seven algorithms before the
 * simulator asks the reader to drive one.
 *
 * The five-act scroll hero that used to sit here still lives in
 * `src/ui/hero/`, unused — it was removed from the page, not deleted.
 */
export default function Home() {
  return (
    <>
      <AlgorithmVideo />
      <Simulator />
    </>
  );
}
