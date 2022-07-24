import AddIcon from '@mui/icons-material/AddCircleOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import HandshakeIcon from '@mui/icons-material/Handshake';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import type { Equipment } from '@prisma/client';
import { useI18n } from 'next-rosetta';
import Image from 'next/image';
import { useContext, useEffect, useRef, useState } from 'react';
import dice20 from '../../../public/dice20.webp';
import SheetContainer from './Section';
import {
	AddDataContext,
	ApiContext,
	DiceRollContext,
	LoggerContext,
	SocketContext,
} from '../../contexts';
import useExtendedState from '../../hooks/useExtendedState';
import type { Locale } from '../../i18n';
import type { EquipmentSheetApiResponse } from '../../pages/api/sheet/equipment';
import type { PlayerEquipmentApiResponse } from '../../pages/api/sheet/player/equipment';
import type { TradeEquipmentApiResponse } from '../../pages/api/sheet/player/trade/equipment';
import { handleDefaultApiResponse } from '../../utils';
import { resolveDices } from '../../utils/dice';
import type { PlayerTradeRequestEvent, PlayerTradeResponseEvent } from '../../utils/socket';
import PartialBackdrop from '../PartialBackdrop';

type PlayerCombatContainerProps = {
	title: string;
	playerEquipments: {
		Equipment: Equipment;
		currentAmmo: number;
	}[];
};

// const tradeInitialValue: Trade<Equipment> = {
// 	type: 'equipment',
// 	show: false,
// 	offer: { id: 0, name: '' } as Equipment,
// 	donation: true,
// };

const PlayerCombatContainer: React.FC<PlayerCombatContainerProps> = (props) => {
	const [loading, setLoading] = useState(false);
	const [playerEquipments, setPlayerEquipments] = useState(props.playerEquipments);
	// const [trade, setTrade] = useState<Trade<Equipment>>(tradeInitialValue);

	// const [diceRollResultModalProps, onDiceRoll] = useDiceRoll();

	const currentTradeId = useRef<number | null>(null);
	const tradeTimeout = useRef<NodeJS.Timeout | null>(null);

	const socket = useContext(SocketContext);
	const log = useContext(LoggerContext);
	const api = useContext(ApiContext);
	const addDataDialog = useContext(AddDataContext);
	const { t } = useI18n<Locale>();

	const socket_requestReceived = useRef<PlayerTradeRequestEvent>(() => {});
	const socket_responseReceived = useRef<PlayerTradeResponseEvent>(() => {});

	useEffect(() => {
		socket_requestReceived.current = (
			type,
			tradeId,
			receiverObjectId,
			senderName,
			equipmentName
		) => {
			if (type !== 'equipment') return;

			currentTradeId.current = tradeId;

			const equip = playerEquipments.find((eq) => eq.Equipment.id === receiverObjectId);

			if (!equip) return console.warn('Equipment not found:', receiverObjectId);

			const accept = confirm(
				`${senderName} te ofereceu ${equipmentName}${
					receiverObjectId ? ` em troca de ${equip.Equipment.name}.` : '.'
				}` + ' Você deseja aceitar essa proposta?'
			);

			api
				.post<TradeEquipmentApiResponse>('/sheet/player/trade/equipment', {
					tradeId,
					accept,
				})
				.then(({ data }) => {
					if (data.status === 'failure') {
						switch (data.reason) {
							case 'trade_does_not_exist':
								return log({ text: 'This trade does not exist anymore.', severity: 'warning' });
							default:
								return log({ text: `Unknown error. Reason: ${data.reason}`, severity: 'error' });
						}
					}

					const newEquip = data.equipment;

					if (!accept || !newEquip) return;

					if (receiverObjectId) {
						setPlayerEquipments((equipments) =>
							equipments.map((eq) => {
								if (eq.Equipment.id === receiverObjectId) return newEquip;
								return eq;
							})
						);
					} else {
						setPlayerEquipments((equipments) => [...equipments, newEquip]);
					}
				})
				.catch(log)
				.finally(() => (currentTradeId.current = null));
		};

		socket_responseReceived.current = (accept, tradeRes) => {
			if (!currentTradeId.current) return;

			currentTradeId.current = null;
			if (tradeTimeout.current) {
				clearTimeout(tradeTimeout.current);
				tradeTimeout.current = null;
			}

			if (accept) {
				// const index = playerEquipments.findIndex((e) => e.Equipment.id === trade.offer.id);
				// if (index === -1) return;
				// if (tradeRes) {
				// 	if (tradeRes.type !== 'equipment')
				// 		return log({ text: 'Expected equipment', severity: 'error' });
				// 	const oldEq = playerEquipments[index];
				// 	availableEquipments.push(oldEq.Equipment);
				// 	availableEquipments.splice(
				// 		availableEquipments.findIndex((e) => e.id === tradeRes.obj.Equipment.id),
				// 		1
				// 	);
				// 	setAvailableEquipments([...availableEquipments]);
				// 	playerEquipments[index] = tradeRes.obj;
				// } else {
				// 	const eq = playerEquipments.splice(index, 1)[0];
				// 	setAvailableEquipments((e) => [...e, eq.Equipment]);
				// }
				// setPlayerEquipments([...playerEquipments]);
			} else {
				log({ text: 'Trade rejected.', severity: 'info' });
			}
			setLoading(false);
			// setTrade(tradeInitialValue);
		};
	});

	useEffect(() => {
		socket.on(
			'playerTradeRequest',
			(type, tradeId, receiverObjectId, senderName, senderObjectName) =>
				socket_requestReceived.current(
					type,
					tradeId,
					receiverObjectId,
					senderName,
					senderObjectName
				)
		);
		socket.on('playerTradeResponse', (accept, eq) => socket_responseReceived.current(accept, eq));
		return () => {
			socket.off('playerTradeRequest');
			socket.off('playerTradeResponse');
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onAddEquipment = (id: number) => {
		addDataDialog.closeDialog();
		setLoading(true);
		api
			.put<PlayerEquipmentApiResponse>('/sheet/player/equipment', { id })
			.then((res) => {
				if (res.data.status === 'success') {
					const equipment = res.data.equipment;
					return setPlayerEquipments([
						...playerEquipments,
						{
							...equipment,
							...equipment.Equipment,
						},
					]);
				}
				handleDefaultApiResponse(res, log);
			})
			.catch((err) => log({ severity: 'error', text: err.message }))
			.finally(() => setLoading(false));
	};

	const loadAvailableEquipments = () => {
		setLoading(true);
		api
			.get<EquipmentSheetApiResponse>('/sheet/equipment')
			.then((res) => {
				if (res.data.status === 'success')
					return addDataDialog.openDialog(res.data.equipment, onAddEquipment);
				handleDefaultApiResponse(res, log);
			})
			.catch((err) => log({ severity: 'error', text: err.message }))
			.finally(() => setLoading(false));
	};

	const onDeleteEquipment = async (id: number) => {
		if (!confirm(t('prompt.delete', { name: 'equip' }))) return;
		setLoading(true);
		api
			.delete<PlayerEquipmentApiResponse>('/sheet/player/equipment', {
				data: { id },
			})
			.then((res) => {
				if (res.data.status === 'failure') return handleDefaultApiResponse(res, log);
				setPlayerEquipments((e) => e.filter((e) => e.Equipment.id !== id));
			})
			.catch((err) => log({ severity: 'error', text: err.message }))
			.finally(() => setLoading(false));
	};

	return (
		<SheetContainer
			title={props.title}
			sx={{ position: 'relative' }}
			sideButton={
				<IconButton aria-label='Add Equipment' onClick={loadAvailableEquipments}>
					<AddIcon />
				</IconButton>
			}>
			<PartialBackdrop open={loading}>
				<CircularProgress color='inherit' disableShrink />
			</PartialBackdrop>
			<TableContainer>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell padding='none'></TableCell>
							<TableCell padding='none'></TableCell>
							<TableCell padding='none'></TableCell>
							<TableCell align='center'>{t('sheet.table.name')}</TableCell>
							<TableCell align='center'>{t('sheet.table.type')}</TableCell>
							<TableCell align='center'>{t('sheet.table.damage')}</TableCell>
							<TableCell align='center' padding='none'></TableCell>
							<TableCell align='center'>{t('sheet.table.range')}</TableCell>
							<TableCell align='center'>{t('sheet.table.attacks')}</TableCell>
							<TableCell align='center'>{t('sheet.table.currentAmmo')}</TableCell>
							<TableCell align='center'>{t('sheet.table.ammo')}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{playerEquipments.map((eq) => (
							<PlayerCombatField
								key={eq.Equipment.id}
								{...eq.Equipment}
								currentAmmo={eq.currentAmmo}
								onDelete={() => onDeleteEquipment(eq.Equipment.id)}
							/>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</SheetContainer>
	);
};

type PlayerCombatFieldProps = { [T in keyof Equipment]: Equipment[T] } & {
	currentAmmo: number;
	onDelete: () => void;
};

const PlayerCombatField: React.FC<PlayerCombatFieldProps> = (props) => {
	const [currentAmmo, setCurrentAmmo, isClean] = useExtendedState(props.currentAmmo);
	const log = useContext(LoggerContext);
	const api = useContext(ApiContext);
	const rollDice = useContext(DiceRollContext);

	const handleDiceClick = () => {
		if (props.ammo && currentAmmo === 0) return alert('TODO: Você não tem munição suficiente.');

		const aux = resolveDices(props.damage);

		if (!aux) return;

		rollDice(aux);

		const ammo = currentAmmo - 1;
		setCurrentAmmo(ammo);
		api
			.post<PlayerEquipmentApiResponse>('/sheet/player/equipment', {
				id: props.id,
				currentAmmo: ammo,
			})
			.then((res) => handleDefaultApiResponse(res, log))
			.catch((err) => log({ severity: 'error', text: err.message }));
	};

	const onAmmoChange: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
		const aux = ev.target.value;
		let newAmmo = parseInt(aux) || 0;
		setCurrentAmmo(newAmmo);
	};

	const onAmmoBlur: React.FocusEventHandler<HTMLInputElement> = (ev) => {
		if (isClean()) return;
		let newAmmo = currentAmmo;

		if (props.ammo && currentAmmo > props.ammo) newAmmo = props.ammo;

		setCurrentAmmo(newAmmo);

		api
			.post<PlayerEquipmentApiResponse>('/sheet/player/equipment', {
				id: props.id,
				currentAmmo: newAmmo,
			})
			.then((res) => handleDefaultApiResponse(res, log))
			.catch((err) => log({ severity: 'error', text: err.message }));
	};

	return (
		<>
			<TableRow>
				<TableCell align='center' padding='none'>
					<IconButton size='small' onClick={props.onDelete}>
						<DeleteIcon />
					</IconButton>
				</TableCell>
				<TableCell align='center' padding='none'>
					<IconButton size='small'>
						<VolunteerActivismIcon />
					</IconButton>
				</TableCell>
				<TableCell align='center' padding='none'>
					<IconButton size='small'>
						<HandshakeIcon />
					</IconButton>
				</TableCell>
				<TableCell align='center'>{props.name}</TableCell>
				<TableCell align='center'>{props.type}</TableCell>
				<TableCell align='center'>{props.damage}</TableCell>
				<TableCell align='center' padding='none'>
					{props.damage && (
						<Image
							src={dice20}
							alt='Dice'
							className='clickable'
							onClick={handleDiceClick}
							width={30}
							height={30}
						/>
					)}
				</TableCell>
				<TableCell align='center'>{props.range}</TableCell>
				<TableCell align='center'>{props.attacks}</TableCell>
				<TableCell align='center'>
					{props.ammo ? (
						<TextField
							variant='standard'
							value={currentAmmo}
							onChange={onAmmoChange}
							onBlur={onAmmoBlur}
						/>
					) : (
						'-'
					)}
				</TableCell>
				<TableCell align='center'>{props.ammo || '-'}</TableCell>
			</TableRow>
		</>
	);
};

export default PlayerCombatContainer;