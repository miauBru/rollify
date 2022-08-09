import { useEffect, useRef, useState } from 'react';
import Fade from '@mui/material/Fade';
import Zoom from '@mui/material/Zoom';
import type { SocketIO } from '../../hooks/useSocket';
import styles from '../../styles/modules/Portrait.module.css';
import { sleep } from '../../utils';
import type { DiceResponse } from '../../utils/dice';
import { getShadowStyle, PortraitConfig } from '../../utils/portrait';

type PortraitDiceContainerProps = {
	socket: SocketIO;
	playerId: number;
	showDice: boolean;
	onShowDice: () => void;
	onHideDice: () => void;
	color: string;
	showDiceRoll: boolean;
	diceTypography?: PortraitConfig['typography']['dice'];
	diceTransition?: PortraitConfig['transitions']['dice'];
};

const PortraitDiceContainer: React.FC<PortraitDiceContainerProps> = (props) => {
	const diceQueue = useRef<DiceResponse[]>([]);
	const diceData = useRef<DiceResponse>();

	const showDiceRef = useRef(props.showDice);

	const [diceResult, setDiceResult] = useState<number | null>(null);
	const diceResultRef = useRef<HTMLDivElement>(null);
	const lastDiceResult = useRef(0);
	const [diceDescription, setDiceDescription] = useState<string | null>(null);
	const diceDescriptionRef = useRef<HTMLDivElement>(null);
	const lastDiceDescription = useRef('');

	const diceVideo = useRef<HTMLVideoElement>(null);

	const exitTimeout = props.diceTransition?.exitTimeout || 500;

	useEffect(() => {
		if (!props.showDiceRoll) return;

		const style = getShadowStyle(props.color);
		if (diceResultRef.current) diceResultRef.current.style.textShadow = style.textShadow;
		if (diceDescriptionRef.current) diceDescriptionRef.current.style.textShadow = style.textShadow;

		const showDiceRoll = () => {
			if (showDiceRef.current) return;
			showDiceRef.current = true;
			if (diceVideo.current) {
				props.onShowDice();
				diceVideo.current.currentTime = 0;
				diceVideo.current.play();
			}
		};

		const showNextResult = async (result: DiceResponse) => {
			showDiceRoll();
			await sleep(750);
			diceData.current = undefined;
			onDiceResult(result);
		};

		const onDiceResult = async (result: DiceResponse) => {
			if (diceData.current) return diceQueue.current.push(result);
			if (!showDiceRef.current) return showNextResult(result);

			diceData.current = result;

			lastDiceResult.current = result.roll;
			setDiceResult(result.roll);

			if (result.description) {
				lastDiceDescription.current = result.description;
				await sleep(500);
				setDiceDescription(result.description);
			}

			await sleep(props.diceTransition?.screenTimeout || 1500);

			setDiceResult(null);
			setDiceDescription(null);

			await sleep(100);

			props.onHideDice();

			await sleep(exitTimeout);

			showDiceRef.current = false;

			const next = diceQueue.current.shift();
			if (next) showNextResult(next);
			else diceData.current = undefined;
		};

		props.socket.on('diceRoll', showDiceRoll);
		props.socket.on('diceResult', (playerId, results, dices) => {
			if (playerId !== props.playerId) return;

			if (results.length === 1) return onDiceResult(results[0]);

			if (Array.isArray(dices)) {
				onDiceResult({
					roll: results.reduce((prev, cur) => prev + cur.roll, 0),
				});
			} else {
				if (diceData.current) return diceQueue.current.push(...results);
				const first = results.shift();
				if (!first) return;
				diceQueue.current.push(...results);
				onDiceResult(first);
			}
		});

		return () => {
			props.socket.off('diceRoll');
			props.socket.off('diceResult');
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className={styles.diceContainer}>
			<Zoom
				in={props.showDice}
				easing={{ enter: 'ease-out', exit: 'ease-in' }}
				timeout={{
					enter: props.diceTransition?.enterTimeout || 750,
					exit: exitTimeout,
				}}>
				<video muted className={styles.dice} ref={diceVideo}>
					<source src='/dice_animation.webm' />
				</video>
			</Zoom>
			<Fade in={diceResult !== null}>
				<div
					className={styles.result}
					ref={diceResultRef}
					style={{
						fontSize: props.diceTypography?.result.fontSize || 96,
						fontStyle: props.diceTypography?.result.italic ? 'italic' : undefined,
					}}>
					{diceResult || lastDiceResult.current}
				</div>
			</Fade>
			<Fade in={diceDescription !== null}>
				<div
					className={styles.description}
					ref={diceDescriptionRef}
					style={{
						fontSize: props.diceTypography?.description.fontSize || 72,
						fontStyle: props.diceTypography?.description.italic ? 'italic' : undefined,
					}}>
					{diceDescription || lastDiceDescription.current}
				</div>
			</Fade>
		</div>
	);
};

export default PortraitDiceContainer;
