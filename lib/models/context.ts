import { AmazonConnectContext } from './amazon-connect-context';
import { C3Context } from './c3-context';
import { FeaturesContext } from './features-context';

export interface Context {
	stackEnvName: string;
	amazonConnect: AmazonConnectContext;
	c3: C3Context;
	logoUrl: string;
	supportPhone: string;
	supportEmail: string;
	features: FeaturesContext;
}
