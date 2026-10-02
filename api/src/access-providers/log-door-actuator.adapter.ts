import { Injectable, Logger } from '@nestjs/common';
import { DoorActuatorPort, DoorOpenCommand } from './door-actuator.port';

/**
 * Actuador sin hardware: solo deja constancia en el log de que se hubiera abierto.
 *
 * @remarks Reemplazar por el adapter real (relé / comando ZKTeco) cuando haya equipo.
 */
@Injectable()
export class LogDoorActuatorAdapter extends DoorActuatorPort {
  private readonly logger = new Logger(LogDoorActuatorAdapter.name);

  open(command: DoorOpenCommand): Promise<boolean> {
    this.logger.log(
      `Abrir puerta (simulado) provider=${command.provider} tenant=${command.tenantId} device=${command.deviceSerial ?? '-'} attempt=${command.accessAttemptId}`,
    );
    return Promise.resolve(true);
  }
}
